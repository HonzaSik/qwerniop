import type { SessionRecord } from "../core/engine/record";
import type { Layout } from "../core/layouts/layout";
import { type Progress, parseProgress } from "../core/lessons/lessons";
import { migrateSettings, type Settings } from "../core/settings/settings";
import { type Database, openDatabase } from "./db";

const SETTINGS_KEY = "current";

export interface Stored {
  settings: Settings;
  progress: Progress;
}

/** Saves swallow failures: losing a write must never break typing, and the next change retries. */
export interface Store {
  saveSettings(settings: Settings): void;
  saveProgress(progress: Progress): void;
  addSession(record: SessionRecord): void;
}

const quiet = (write: Promise<unknown>): void => {
  write.catch((error: unknown) => console.error("Storage write failed", error));
};

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
  return {
    saveSettings: (s) => quiet(db.put("settings", s, SETTINGS_KEY)),
    saveProgress: (p) => quiet(db.put("progress", p, layout)),
    addSession: (r) => quiet(db.add("sessions", r)),
  };
}
