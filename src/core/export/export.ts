import { parseSessionRecord, type SessionRecord } from "../engine/record";
import { type Progress, parseProgress } from "../lessons/lessons";
import { migrateSettings, type Settings } from "../settings/settings";

export const EXPORT_SCHEMA = 1;

/** Layouts whose progress is kept; progress for any other id in a file is ignored. */
export const PROGRESS_LAYOUTS = ["en-us", "cs-qwertz"] as const;
type ProgressLayout = (typeof PROGRESS_LAYOUTS)[number];

export interface AppData {
  settings: Settings;
  progress: Record<ProgressLayout, Progress>;
  sessions: SessionRecord[];
}

export type ExportError = "notExport" | "noFormat" | "newer" | "noSessions";

export type ParsedExport =
  | { ok: true; value: AppData; droppedSessions: number }
  | { ok: false; reason: ExportError };

export function buildExport(data: AppData, now: Date): string {
  return JSON.stringify({
    app: "tenfold",
    schema: EXPORT_SCHEMA,
    exportedAt: now.toISOString(),
    ...data,
  });
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const fail = (reason: ExportError): ParsedExport => ({ ok: false, reason });

/**
 * Validates an untrusted, already-parsed export file. Settings and progress
 * repair themselves field by field; invalid sessions are dropped and counted.
 * No schema is older than 1, so there is no migration step yet: add one here
 * when schema 2 exists.
 */
export function parseExport(raw: unknown): ParsedExport {
  if (!isRecord(raw) || raw.app !== "tenfold") {
    return fail("notExport");
  }
  const { schema } = raw;
  if (typeof schema !== "number" || !Number.isInteger(schema) || schema < 1) {
    return fail("noFormat");
  }
  if (schema > EXPORT_SCHEMA) {
    return fail("newer");
  }
  if (!Array.isArray(raw.sessions)) return fail("noSessions");
  const progress = isRecord(raw.progress) ? raw.progress : {};
  const sessions = raw.sessions.flatMap((s) => parseSessionRecord(s) ?? []);
  return {
    ok: true,
    droppedSessions: raw.sessions.length - sessions.length,
    value: {
      settings: migrateSettings(raw.settings),
      progress: {
        "en-us": parseProgress("en-us", progress["en-us"]),
        "cs-qwertz": parseProgress("cs-qwertz", progress["cs-qwertz"]),
      },
      sessions,
    },
  };
}
