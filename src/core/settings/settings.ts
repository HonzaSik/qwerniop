import type { Targets } from "../adaptive/weakness";
import type { ErrorMode } from "../engine/engine";
import type { Layout } from "../layouts/layout";
import { LAYOUTS } from "../layouts/registry";

export const KEYBOARD_MODE_VALUES = ["fingers", "next", "hidden"] as const;
export type KeyboardMode = (typeof KEYBOARD_MODE_VALUES)[number];

export const REDUCE_MOTION_VALUES = ["system", "on", "off"] as const;
export type ReduceMotion = (typeof REDUCE_MOTION_VALUES)[number];

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

export const TARGET_ACCURACIES = [0.9, 0.95, 0.98] as const;
export const TARGET_WPMS = [20, 25, 30, 35, 40, 50, 60] as const;

export const SETTINGS_VERSION = 1;

export interface Settings {
  version: number;
  layout: Layout["id"];
  errorMode: ErrorMode;
  length: SessionLength;
  keyboardMode: KeyboardMode;
  targets: Targets;
  reduceMotion: ReduceMotion;
}

export const defaultSettings = (): Settings => ({
  version: SETTINGS_VERSION,
  layout: "en-us",
  errorMode: "stop",
  length: { kind: "words", amount: 30 },
  keyboardMode: "fingers",
  targets: { accuracy: 0.95, wpm: 35 },
  reduceMotion: "system",
});

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/**
 * Turns anything read from storage into valid Settings. Each field falls back
 * to its default on its own, so one bad or missing field loses nothing else.
 * Older versions are upgraded here (none yet differ from version 1; a missing layout reads as en-us).
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
  const targets = isRecord(old.targets) ? old.targets : undefined;
  return {
    version: SETTINGS_VERSION,
    layout: LAYOUTS.find((l) => l.id === old.layout)?.id ?? defaults.layout,
    errorMode:
      old.errorMode === "stop" || old.errorMode === "continue"
        ? old.errorMode
        : defaults.errorMode,
    length: length ?? defaults.length,
    keyboardMode:
      KEYBOARD_MODE_VALUES.find((m) => m === old.keyboardMode) ??
      defaults.keyboardMode,
    reduceMotion:
      REDUCE_MOTION_VALUES.find((m) => m === old.reduceMotion) ??
      defaults.reduceMotion,
    targets: {
      accuracy:
        TARGET_ACCURACIES.find((a) => a === targets?.accuracy) ??
        defaults.targets.accuracy,
      wpm: TARGET_WPMS.find((w) => w === targets?.wpm) ?? defaults.targets.wpm,
    },
  };
}
