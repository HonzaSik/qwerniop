import type { ErrorMode } from "../engine/engine";

export const KEYBOARD_MODE_VALUES = ["fingers", "next", "hidden"] as const;
export type KeyboardMode = (typeof KEYBOARD_MODE_VALUES)[number];

export type SessionLength =
  | { kind: "words"; amount: number }
  | { kind: "seconds"; amount: number };

export const SESSION_LENGTHS: readonly SessionLength[] = [
  { kind: "words", amount: 15 },
  { kind: "words", amount: 30 },
  { kind: "words", amount: 60 },
  { kind: "seconds", amount: 30 },
  { kind: "seconds", amount: 60 },
  { kind: "seconds", amount: 120 },
];

export const SETTINGS_VERSION = 1;

export interface Settings {
  version: number;
  errorMode: ErrorMode;
  length: SessionLength;
  keyboardMode: KeyboardMode;
}

export const defaultSettings = (): Settings => ({
  version: SETTINGS_VERSION,
  errorMode: "stop",
  length: { kind: "words", amount: 30 },
  keyboardMode: "fingers",
});

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/**
 * Turns anything read from storage into valid Settings. Each field falls back
 * to its default on its own, so one bad or missing field loses nothing else.
 * Older versions are upgraded here (none yet differ from version 1).
 */
export function migrateSettings(old: unknown): Settings {
  const defaults = defaultSettings();
  if (!isRecord(old)) return defaults;
  const length = SESSION_LENGTHS.find(
    (l) =>
      isRecord(old.length) &&
      l.kind === old.length.kind &&
      l.amount === old.length.amount,
  );
  return {
    version: SETTINGS_VERSION,
    errorMode:
      old.errorMode === "stop" || old.errorMode === "continue"
        ? old.errorMode
        : defaults.errorMode,
    length: length ?? defaults.length,
    keyboardMode:
      KEYBOARD_MODE_VALUES.find((m) => m === old.keyboardMode) ??
      defaults.keyboardMode,
  };
}
