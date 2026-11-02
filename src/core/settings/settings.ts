import type { Targets } from "../adaptive/weakness";
import type { ErrorMode } from "../engine/engine";
import type { Layout } from "../layouts/layout";
import { LAYOUTS } from "../layouts/registry";

export const KEYBOARD_MODE_VALUES = ["fingers", "next", "hidden"] as const;
export type KeyboardMode = (typeof KEYBOARD_MODE_VALUES)[number];

export const REDUCE_MOTION_VALUES = ["system", "on", "off"] as const;
export type ReduceMotion = (typeof REDUCE_MOTION_VALUES)[number];

export const LANGUAGE_VALUES = ["system", "en", "cs"] as const;
export type Language = (typeof LANGUAGE_VALUES)[number];

export const THEME_VALUES = ["system", "light", "dark", "oled"] as const;
export type Theme = (typeof THEME_VALUES)[number];

export const ACCENT_VALUES = ["blue", "green", "purple", "orange"] as const;
export type Accent = (typeof ACCENT_VALUES)[number];

export const TEXT_SIZE_VALUES = ["small", "medium", "large"] as const;
export type TextSize = (typeof TEXT_SIZE_VALUES)[number];

export const CARET_VALUES = ["bar", "block", "underline"] as const;
export type CaretStyle = (typeof CARET_VALUES)[number];

export type SessionLength =
  | { kind: "words"; amount: number }
  | { kind: "seconds"; amount: number };

export const SESSION_LENGTHS: readonly SessionLength[] = [
  { kind: "words", amount: 10 },
  { kind: "words", amount: 15 },
  { kind: "words", amount: 30 },
  { kind: "words", amount: 60 },
  { kind: "words", amount: 100 },
  { kind: "words", amount: 200 },
  { kind: "seconds", amount: 15 },
  { kind: "seconds", amount: 30 },
  { kind: "seconds", amount: 60 },
  { kind: "seconds", amount: 120 },
  { kind: "seconds", amount: 300 },
  { kind: "seconds", amount: 600 },
];

export const TARGET_ACCURACIES = [0.9, 0.95, 0.98] as const;
export const TARGET_WPMS = [20, 25, 30, 35, 40, 50, 60] as const;

export const SETTINGS_VERSION = 1;

export const AI_MODES = ["lesson", "topic", "code", "feedback"] as const;
export type AiMode = (typeof AI_MODES)[number];

/** Where the optional model server lives; excluded from export. */
export interface ModelServer {
  enabled: boolean;
  modes: Record<AiMode, boolean>;
  /** The subject of the learn-a-topic mode; empty means that mode is idle. */
  topic: string;
  baseUrl: string;
  /** Empty until chosen from the server's list. */
  model: string;
  /** Empty means no Authorization header. */
  apiKey: string;
}

export const DEFAULT_BASE_URL = "http://localhost:11434/v1";

export const PET_NAME_MAX = 20;

export const cleanPetName = (v: unknown): string =>
  typeof v === "string" ? v.trim().slice(0, PET_NAME_MAX).trim() : "";

export interface Settings {
  version: number;
  layout: Layout["id"];
  errorMode: ErrorMode;
  length: SessionLength;
  keyboardMode: KeyboardMode;
  targets: Targets;
  reduceMotion: ReduceMotion;
  language: Language;
  theme: Theme;
  accent: Accent;
  textSize: TextSize;
  caret: CaretStyle;
  liveStats: boolean;
  /** Every lesson can be started; progress is never changed by it. */
  developerMode: boolean;
  /** Empty until the learner names the pet, which happens once. */
  petName: string;
  modelServer: ModelServer;
}

export const defaultSettings = (): Settings => ({
  version: SETTINGS_VERSION,
  layout: "en-us",
  errorMode: "stop",
  length: { kind: "words", amount: 30 },
  keyboardMode: "fingers",
  targets: { accuracy: 0.95, wpm: 35 },
  reduceMotion: "system",
  language: "system",
  theme: "system",
  accent: "blue",
  textSize: "medium",
  caret: "bar",
  liveStats: false,
  developerMode: false,
  petName: "",
  modelServer: {
    enabled: false,
    modes: { lesson: true, topic: true, code: true, feedback: true },
    topic: "",
    baseUrl: DEFAULT_BASE_URL,
    model: "",
    apiKey: "",
  },
});

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/**
 * Turns anything read from storage into valid Settings. Each field falls back
 * to its default on its own, so one bad or missing field loses nothing else.
 * Older versions are upgraded here (none yet differ from version 1; a missing layout reads as en-us, a missing language as system).
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
  const server = isRecord(old.modelServer) ? old.modelServer : undefined;
  const text = (v: unknown, fallback: string): string =>
    typeof v === "string" ? v : fallback;
  const flag = (v: unknown, fallback: boolean): boolean =>
    typeof v === "boolean" ? v : fallback;
  const modes = isRecord(server?.modes) ? server.modes : undefined;
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
    language:
      LANGUAGE_VALUES.find((l) => l === old.language) ?? defaults.language,
    theme: THEME_VALUES.find((v) => v === old.theme) ?? defaults.theme,
    accent: ACCENT_VALUES.find((v) => v === old.accent) ?? defaults.accent,
    textSize:
      TEXT_SIZE_VALUES.find((v) => v === old.textSize) ?? defaults.textSize,
    caret: CARET_VALUES.find((v) => v === old.caret) ?? defaults.caret,
    liveStats: flag(old.liveStats, defaults.liveStats),
    developerMode: flag(old.developerMode, defaults.developerMode),
    petName: cleanPetName(old.petName),
    modelServer: {
      enabled: flag(server?.enabled, defaults.modelServer.enabled),
      modes: {
        lesson: flag(modes?.lesson, defaults.modelServer.modes.lesson),
        topic: flag(modes?.topic, defaults.modelServer.modes.topic),
        code: flag(modes?.code, defaults.modelServer.modes.code),
        feedback: flag(modes?.feedback, defaults.modelServer.modes.feedback),
      },
      topic: text(server?.topic, defaults.modelServer.topic),
      baseUrl: text(server?.baseUrl, defaults.modelServer.baseUrl),
      model: text(server?.model, defaults.modelServer.model),
      apiKey: text(server?.apiKey, defaults.modelServer.apiKey),
    },
    targets: {
      accuracy:
        TARGET_ACCURACIES.find((a) => a === targets?.accuracy) ??
        defaults.targets.accuracy,
      wpm: TARGET_WPMS.find((w) => w === targets?.wpm) ?? defaults.targets.wpm,
    },
  };
}
