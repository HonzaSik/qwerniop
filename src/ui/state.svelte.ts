import type { SessionRecord } from "../core/engine/record";
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
