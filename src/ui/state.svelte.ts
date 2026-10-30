import type { SessionRecord } from "../core/engine/record";
import type { AppData } from "../core/export/export";
import {
  initialProgress,
  type Lesson,
  type Progress,
} from "../core/lessons/lessons";
import {
  defaultSettings,
  type KeyboardMode,
  type SessionLength,
  type Settings,
} from "../core/settings/settings";
import type { Store, Stored } from "../storage/store";

export const KEYBOARD_MODES: readonly { value: KeyboardMode; label: string }[] =
  [
    { value: "fingers", label: "Finger colours" },
    { value: "next", label: "Next key only" },
    { value: "hidden", label: "Hidden" },
  ];

export const lengthLabel = (l: SessionLength): string =>
  `${l.amount} ${l.kind === "words" ? "words" : "s"}`;

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
  }
}

/** Call after changing `ui.settings`, never per keystroke. */
export const saveSettings = (): void =>
  store?.saveSettings($state.snapshot(ui.settings));
export const saveProgress = (): void =>
  store?.saveProgress($state.snapshot(ui.progress));
export const saveSession: Store["addSession"] = (r) => store?.addSession(r);

/** Read when the Stats view opens, never while typing. */
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
      progress: { "en-us": $state.snapshot(ui.progress) },
      sessions: await readSessions(),
    },
    new Date(),
  );
}

/**
 * Replaces everything. Saved data is written first, so a failed write throws
 * and leaves memory as it was. Resolves false in memory-only mode.
 */
export async function replaceAll(data: AppData): Promise<boolean> {
  await store?.replaceAll(data);
  ui.settings = data.settings;
  ui.progress = data.progress["en-us"];
  ui.lesson = { track: "letters", stage: 1 };
  return store !== null;
}
