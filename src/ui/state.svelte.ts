import type { SessionRecord } from "../core/engine/record";
import type { AppData } from "../core/export/export";
import type { Layout } from "../core/layouts/layout";
import {
  initialProgress,
  type Lesson,
  type Progress,
} from "../core/lessons/lessons";
import {
  defaultSettings,
  type KeyboardMode,
  type Settings,
} from "../core/settings/settings";
import type { TopicHistory } from "../core/topics/history";
import type { Store, Stored } from "../storage/store";

export const KEYBOARD_MODES: readonly KeyboardMode[] = [
  "fingers",
  "next",
  "hidden",
];

export const ui: {
  settings: Settings;
  progress: Progress;
  lesson: Lesson;
} = $state({
  settings: defaultSettings(),
  progress: initialProgress(),
  lesson: { track: "letters", stage: 1 },
});

// Null until storage opens, and for good when it is unavailable: the app then runs memory-only.
let store: Store | null = null;

export function hydrate(loaded: {
  store: Store | null;
  stored: Stored | null;
}): void {
  store = loaded.store;
  if (loaded.stored) {
    ui.settings = loaded.stored.settings;
    ui.progress = loaded.stored.progress;
    ui.lesson = loaded.stored.progress.lesson;
  }
}

/** Call after changing `ui.settings`, never per keystroke. */
export const saveSettings = (): void =>
  store?.saveSettings($state.snapshot(ui.settings));
/** The lesson lives in `ui.lesson`; it joins progress only here, so there is one source while running. */
const withLesson = (): Progress => ({
  ...$state.snapshot(ui.progress),
  lesson: $state.snapshot(ui.lesson),
});
export const saveProgress = (): void =>
  store?.saveProgress(ui.settings.layout, withLesson());
export const saveSession: Store["addSession"] = (r) => store?.addSession(r);
/** Topic history lives only in storage: it is neither exported nor kept in memory-only mode. */
export const topicStore = {
  load: async (topic: string) => (await store?.readTopic(topic)) ?? undefined,
  save: (topic: string, history: TopicHistory) =>
    store?.saveTopic(topic, history),
};

// Progress of the layouts not in use, so memory-only mode keeps it across switches.
let others: Partial<Record<Layout["id"], Progress>> = {};

/** Progress of any layout; the one in use comes from `ui`, the rest from memory or storage. */
async function progressOf(id: Layout["id"]): Promise<Progress> {
  if (id === ui.settings.layout) return withLesson();
  return others[id] ?? (await store?.readProgress(id)) ?? initialProgress();
}

/**
 * Makes `id` the layout in use and loads its progress. Rejects with nothing
 * changed when the saved progress cannot be read, so a failed read is never
 * saved over real progress.
 */
export async function switchLayout(id: Layout["id"]): Promise<void> {
  const next = await progressOf(id);
  others[ui.settings.layout] = withLesson();
  ui.settings.layout = id;
  ui.progress = next;
  ui.lesson = next.lesson;
  saveSettings();
}

/** False in memory-only mode, where no history builds up. */
export const savesSessions = (): boolean => store !== null;

/** Read when the Stats view opens and when a session ends, never while typing. */
export const readSessions = async (): Promise<SessionRecord[]> => {
  try {
    return (await store?.readSessions()) ?? [];
  } catch (error) {
    console.error("Storage read failed", error);
    return [];
  }
};

/** The whole app state as export text. Memory-only has no saved sessions to include. */
export async function exportText(): Promise<string> {
  const { buildExport } = await import("../core/export/export");
  return buildExport(
    {
      settings: $state.snapshot(ui.settings),
      progress: {
        "en-us": await progressOf("en-us"),
        "cs-qwertz": await progressOf("cs-qwertz"),
      },
      sessions: await readSessions(),
    },
    new Date(),
  );
}

/** Deletes everything saved. Rejects with nothing deleted; the caller reloads on success, so nothing in memory survives. */
export const deleteAllData = async (): Promise<void> => {
  await store?.clearAll();
};

/**
 * Replaces everything. Saved data is written first, so a failed write throws
 * and leaves memory as it was. Resolves false in memory-only mode.
 */
export async function replaceAll(data: AppData): Promise<boolean> {
  // The export carries no model server, so an import keeps this device's.
  const settings = { ...data.settings, modelServer: ui.settings.modelServer };
  await store?.replaceAll({ ...data, settings });
  ui.settings = settings;
  others = { ...data.progress };
  ui.progress = data.progress[data.settings.layout];
  ui.lesson = data.progress[data.settings.layout].lesson;
  return store !== null;
}
