import { parseSessionRecord, type SessionRecord } from "../core/engine/record";
import type { Layout } from "../core/layouts/layout";
import { type Progress, parseProgress } from "../core/lessons/lessons";
import { migrateSettings, type Settings } from "../core/settings/settings";
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
  saveProgress(progress: Progress): void;
  addSession(record: SessionRecord): void;
  /** Flushes queued writes first so a session just finished is included. Invalid records are dropped. */
  readSessions(): Promise<SessionRecord[]>;
}

/**
 * Opens storage and reads what is saved. `store` is null when storage is
 * unavailable; `stored` is then null too and the app runs memory-only.
 */
export async function loadStore(layout: Layout["id"]): Promise<{
  store: Store | null;
  stored: Stored | null;
}> {
  let db: Database | null = null;
  try {
    db = await openDatabase();
    if (!db) return { store: null, stored: null };
    const [settings, progress] = await Promise.all([
      db.get<unknown>("settings", SETTINGS_KEY),
      db.get<unknown>("progress", layout),
    ]);
    return {
      store: writer(db, layout),
      stored: {
        settings: migrateSettings(settings),
        progress: parseProgress(layout, progress),
      },
    };
  } catch (error) {
    console.error("Storage read failed", error);
    return { store: db ? writer(db, layout) : null, stored: null };
  }
}

function writer(db: Database, layout: Layout["id"]): Store {
  const queue = createWriteQueue(
    {
      putSettings: (s) => db.put("settings", s, SETTINGS_KEY),
      putProgress: (p) => db.put("progress", p, layout),
      addSession: (r) => db.add("sessions", r),
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
    async readSessions() {
      await queue.flush();
      const rows = await db.getAll<unknown>("sessions");
      return rows.flatMap((row) => parseSessionRecord(row) ?? []);
    },
  };
}
