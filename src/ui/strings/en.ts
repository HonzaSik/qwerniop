import type { ProviderErrorKind } from "../../ai/provider";
import type { ExportError } from "../../core/export/export";
import type { Layout } from "../../core/layouts/layout";
import type { LessonTrack, NoNewKeys } from "../../core/lessons/lessons";
import type {
  Accent,
  AiMode,
  CaretStyle,
  KeyboardMode,
  Language,
  TextSize,
  Theme,
} from "../../core/settings/settings";

/** "a, b and c". */
const list = (keys: readonly string[]): string =>
  keys.length < 2
    ? (keys[0] ?? "")
    : `${keys.slice(0, -1).join(", ")} and ${keys.at(-1)}`;

const sessions = (n: number): string => `${n} session${n === 1 ? "" : "s"}`;

export const en = {
  language: "en",
  nav: {
    label: "Views",
    practice: "Practice",
    lessons: "Lessons",
    stats: "Stats",
    settings: "Settings",
  },
  updateAvailable: "Update available",
  updateReload: "Reload",
  layoutLabel: "Layout",
  layoutNames: {
    "en-us": "English (US)",
    "cs-qwertz": "Czech (QWERTZ)",
  } as Record<Layout["id"], string>,
  lengthLabel: "Length",
  reduceMotionLabel: "Reduce motion",
  reduceMotionModes: { system: "System", on: "On", off: "Off" },
  words: (n: number): string => `${n} words`,
  seconds: (n: number): string => (n < 60 ? `${n} s` : `${n / 60} min`),
  keyboardLabel: "Keyboard",
  keyboardModes: {
    fingers: "Finger colours",
    next: "Next key only",
    hidden: "Hidden",
  } as Record<KeyboardMode, string>,
  wordListError: "The word list could not be loaded.",
  tryAgain: "Try again",
  help: {
    title: "Keyboard shortcuts",
    close: "Close",
    items: [
      ["Enter", "Continue to the next lesson"],
      ["R", "Repeat the lesson"],
      ["Esc", "Pause while typing, go back to Practice elsewhere"],
      [",", "Open Settings"],
      ["?", "Show this help"],
    ] as readonly (readonly [string, string])[],
  },
  settings: {
    title: "Settings",
    general: "General",
    practice: "Practice",
    accessibility: "Accessibility",
    appearance: "Appearance",
    themeLabel: "Theme",
    themeNames: {
      system: "System",
      light: "Light",
      dark: "Dark",
      oled: "Black (OLED)",
    } as Record<Theme, string>,
    accentLabel: "Accent colour",
    accentNames: {
      blue: "Blue",
      green: "Green",
      purple: "Purple",
      orange: "Orange",
    } as Record<Accent, string>,
    textSizeLabel: "Text size",
    textSizeNames: {
      small: "Small",
      medium: "Medium",
      large: "Large",
    } as Record<TextSize, string>,
    caretLabel: "Caret",
    caretNames: {
      bar: "Bar",
      block: "Block",
      underline: "Underline",
    } as Record<CaretStyle, string>,
    errorModeLabel: "On a wrong key",
    errorModeNames: {
      stop: "Stop until corrected",
      continue: "Keep going",
    },
    liveStats: "Show speed and accuracy while typing",
    languageLabel: "Language",
    languageNames: { system: "System", en: "English", cs: "Čeština" } as Record<
      Language,
      string
    >,
    modelServer: "Model server",
    intro:
      "Optional. A model on your own machine can write practice text. Tenfold works the same without one. Only prompts and session statistics are sent, never what you type.",
    baseUrl: "Address",
    enabled: "Use the model server",
    modes: "Practice material",
    modeNames: {
      lesson: "Lesson text",
      topic: "Learn a topic",
      code: "Code snippets",
      feedback: "Session feedback",
    } as Record<AiMode, string>,
    topic: "Topic",
    topicNote:
      "For Learn a topic, once every letter is unlocked. For example: how vaccines work.",
    model: "Model",
    noModel: "Run the test to choose a model",
    apiKey: "API key (optional)",
    apiKeyNote: "Stored on this device only and left out of exports.",
    test: "Test connection",
    testing: "Testing",
    connected: (n: number): string =>
      `Connected. ${n} ${n === 1 ? "model" : "models"} found.`,
    errors: {
      network: "The server could not be reached.",
      http: "The server refused the request. Check the address and the API key.",
      timeout: "The server took too long to answer.",
      "bad-response": "The server answered, but not in the expected format.",
      server: "The server reported an error.",
    } as Record<ProviderErrorKind, string>,
    corsTitle: "If the server is running, it may be blocking this page",
    corsIntro:
      "Browsers only allow Tenfold to call a local server that permits its origin.",
    corsOllama: (origin: string): string =>
      `Ollama: start it with OLLAMA_ORIGINS including ${origin}, for example OLLAMA_ORIGINS="${origin}".`,
    corsLmStudio: "LM Studio: enable CORS in the server settings.",
    corsOther:
      "Other servers: see their documentation for allowing cross-origin requests.",
  },
  lesson: "Lesson",
  trackNames: {
    letters: "Letters",
    punctuation: "Punctuation",
    numbers: "Numbers",
    code: "Code",
  } as Record<LessonTrack, string>,
  noNewKeys: { capitals: "capitals", snippets: "whole snippets" } as Record<
    NoNewKeys,
    string
  >,
  lessons: {
    accuracy: "Accuracy",
    speed: "Speed",
    wpm: (n: number): string => `${n} wpm`,
    unlocked: (done: number, all: number): string =>
      `Unlocked ${done} of ${all}`,
    opensAt: (stage: number): string => `Opens at letter lesson ${stage}`,
    done: "Done",
  },
  practice: {
    timeLeft: "Time left",
    typeText: "Type the text",
    paused: "Click or press any key to continue",
    connectKeyboard: "Connect a keyboard to practice",
  },
  summary: {
    label: "Session results",
    wpm: "WPM",
    accuracy: "Accuracy",
    time: "Time",
    weakest: "Weakest keys",
    next: "Continue",
    repeat: "Repeat",
    recap: "Think about it:",
  },
  feedback: {
    unlocked: (title: string): string => `${title} is unlocked.`,
    accuracy: (keys: readonly string[]): string =>
      keys.length > 0
        ? `Slow down and aim for accuracy, especially on ${list(keys)}.`
        : "Slow down and aim for accuracy.",
    speed: (keys: readonly string[]): string =>
      keys.length > 0
        ? `Accuracy is on target. Keep a steady rhythm to build speed on ${list(keys)}.`
        : "Accuracy is on target. Keep a steady rhythm to build speed.",
    met: (keys: readonly string[]): string =>
      keys.length > 0
        ? `Both targets met. ${list(keys)} still ${keys.length === 1 ? "needs" : "need"} practice.`
        : "Both targets met.",
  },
  stats: {
    loading: "Loading",
    empty:
      "No sessions yet. Finish a practice session and it will show up here.",
    history: "History",
    speed: "Speed",
    wpmUnit: "wpm",
    accuracy: "Accuracy",
    errorsByKey: "Errors by key",
    noErrors: "No errors recorded.",
    mostMissed: "Most missed:",
    loadFailed: "Stats could not be loaded.",
    practice: "Practice",
    today: (minutes: number): string =>
      minutes === 0 ? "Not practised yet today" : `Today: ${minutes} min`,
    minutes: (n: number): string => `${n} min`,
    less: "Less",
    more: "More",
    calendar: (days: number): string =>
      `Practised on ${days} ${days === 1 ? "day" : "days"} in this period.`,
    weekStart: 0 as 0 | 1,
    chart: (
      title: string,
      n: number,
      last: number,
      unit: string,
      min: number,
      max: number,
    ): string =>
      `${title} over the last ${n} sessions: latest ${last} ${unit}, lowest ${min}, highest ${max}.`,
  },
  data: {
    title: "Your data",
    export: "Export",
    import: "Import",
    exported: "Exported.",
    exportFailed: "The export failed.",
    tooLarge: "That file is too large to be a Tenfold export.",
    notJson: "The file is not valid JSON.",
    errors: {
      notExport: "This is not a Tenfold export file.",
      noFormat: "The file has no valid format version.",
      newer:
        "The file was made by a newer version of Tenfold. Update the app and try again.",
      noSessions: "The file has no session list.",
    } as Record<ExportError, string>,
    imported: "Imported.",
    importedMemory:
      "Imported for this visit only. Saving is unavailable, so it will be gone when you close the page, and sessions are not kept.",
    importFailed: "The import failed. Nothing was changed.",
    replaceTitle: "Replace your data?",
    replaceBody: (current: number, incoming: number): string =>
      `Your settings, progress and ${sessions(current)} will be replaced by the file's settings, progress and ${sessions(incoming)}. This cannot be undone.`,
    skipped: (n: number): string =>
      `${n} invalid ${n === 1 ? "session" : "sessions"} in the file will be skipped.`,
    cancel: "Cancel",
    replace: "Replace",
  },
};

export type Strings = typeof en;
