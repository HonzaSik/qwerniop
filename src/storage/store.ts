import { parseSessionRecord, type SessionRecord } from "../core/engine/record";
import type { AppData } from "../core/export/export";
import type { Layout } from "../core/layouts/layout";
import { type Progress, parseProgress } from "../core/lessons/lessons";
import { migrateSettings, type Settings } from "../core/settings/settings";
import { parseTopicHistory, type TopicHistory } from "../core/topics/history";
import { type Database, openDatabase } from "./db";
import { createWriteQueue } from "./queue";

const SETTINGS_KEY = "current";

export interface Stored {
  settings: Settings;
  progress: Progress;
}

/** Saves only queue; failed writes stay queued and go out with the next flush. */
export interface Store {
  saveSettings(settings: Settings): void;
  saveProgress(layout: Layout["id"], progress: Progress): void;
  /** Flushes queued writes first so progress just saved is read back. */
  readProgress(layout: Layout["id"]): Promise<Progress>;
  addSession(record: SessionRecord): void;
  saveTopic(topic: string, history: TopicHistory): void;
  /** Flushes queued writes first so a topic just saved is read back. */
  readTopic(topic: string): Promise<TopicHistory>;
  /** Flushes queued writes first so a session just finished is included. Invalid records are dropped. */
  readSessions(): Promise<SessionRecord[]>;
  /** Replaces everything saved, in one transaction; rejects with nothing changed on failure. */
  replaceAll(data: AppData): Promise<void>;
  /** Deletes everything saved, in one transaction; rejects with nothing changed on failure. */
  clearAll(): Promise<void>;
}

/**
 * Opens storage and reads what is saved. `store` is null when storage is
 * unavailable; `stored` is then null too and the app runs memory-only.
 */
export async function loadStore(): Promise<{
  store: Store | null;
  stored: Stored | null;
}> {
  let db: Database | null = null;
  try {
    db = await openDatabase();
    if (!db) return { store: null, stored: null };
    const settings = migrateSettings(await db.get("settings", SETTINGS_KEY));
    const progress = await db.get<unknown>("progress", settings.layout);
    return {
      store: writer(db),
      stored: {
        settings,
        progress: parseProgress(settings.layout, progress),
      },
    };
  } catch (error) {
    console.error("Storage read failed", error);
    return { store: db ? writer(db) : null, stored: null };
  }
}

function writer(db: Database): Store {
  const queue = createWriteQueue(
    {
      putSettings: (s) => db.put("settings", s, SETTINGS_KEY),
      putProgress: (layout, p) => db.put("progress", p, layout),
      addSession: (r) => db.add("sessions", r),
      putTopic: (topic, h) => db.put("topics", h, topic),
    },
    // Off the keystroke path: idle time, but never later than 2s so a busy page still saves.
    (flush) =>
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(flush, { timeout: 2000 })
        : setTimeout(flush, 0),
  );
  const flushNow = (): void => void queue.flush();
  // pagehide covers browsers that skip visibilitychange when a page is discarded.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushNow();
  });
  addEventListener("pagehide", flushNow);
  return {
    saveSettings: queue.saveSettings,
    saveProgress: queue.saveProgress,
    addSession: queue.addSession,
    saveTopic: queue.saveTopic,
    async readTopic(topic) {
      await queue.flush();
      return parseTopicHistory(await db.get<unknown>("topics", topic));
    },
    async readProgress(layout) {
      await queue.flush();
      return parseProgress(layout, await db.get<unknown>("progress", layout));
    },
    async readSessions() {
      await queue.flush();
      const rows = await db.getAll<unknown>("sessions");
      return rows.flatMap((row) => parseSessionRecord(row) ?? []);
    },
    async replaceAll(data) {
      // Queued older values must not land on top of the import.
      queue.discard();
      await queue.flush();
      await db.replaceAll({
        settings: [[SETTINGS_KEY, data.settings]],
        progress: Object.entries(data.progress),
        sessions: data.sessions.map((r) => [null, r]),
      });
    },
    async clearAll() {
      // Queued values must not land after the delete and bring data back.
      queue.discard();
      await queue.flush();
      await db.replaceAll({
        settings: [],
        progress: [],
        sessions: [],
        topics: [],
      });
    },
  };
}
