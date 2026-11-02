import type { ProviderErrorKind } from "../../ai/provider";
import type { ExportError } from "../../core/export/export";
import type { Finger, Layout } from "../../core/layouts/layout";
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
      ["Enter", "Continue to the next lesson, or start it from Lessons"],
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
    developerMode: "Developer mode: start any lesson",
    developerModeNote:
      "Locked lessons can be started to try them. Nothing is unlocked by it, and the sessions still count in Stats.",
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
    topicNote: "Choose the topic for Learn a topic in Lessons.",
    modeNames: {
      lesson: "Lesson text",
      topic: "Learn a topic",
      code: "Code snippets",
      feedback: "Session feedback",
    } as Record<AiMode, string>,
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
    current: "Current",
    count: (done: number, all: number): string => `${done} of ${all}`,
    developerMode: "Developer mode is on: every lesson can be started.",
    loadFailed: "Lessons could not be loaded. Reloading the page may help.",
    tracks: "Tracks",
    nextUp: "Next up",
    unlockProgress: (ready: number, total: number, next: string): string =>
      `${ready} of ${total} keys ready to unlock ${next}.`,
    stillNeeds: "Still needs:",
    unlockReady: (next: string): string =>
      `Every key is ready. Finish a session to unlock ${next}.`,
  },
  weak: {
    title: "Weakest keys",
    intro:
      "Drill the keys you miss most. The more often you miss a key, the more often it appears. It counts in Stats but unlocks nothing.",
    empty: "No key is missed more often than your accuracy target allows.",
    start: "Start",
    practiceTitle: (keys: string): string => `Weakest keys · ${keys}`,
  },
  custom: {
    title: "Custom text",
    intro:
      "Paste anything to type it. It counts in Stats but unlocks nothing, and it stays on this device.",
    field: "Text to type",
    start: "Start",
    dropped: (n: number): string =>
      `${n} ${n === 1 ? "character" : "characters"} can't be typed on this layout and will be left out.`,
    nothing: "Nothing here can be typed on this layout.",
    cut: (max: number): string => `Only the first ${max} characters are kept.`,
  },
  topics: {
    title: "Learn a topic",
    intro:
      "Have a model on your own machine write passages to type about anything you want to learn.",
    setUp: "Set up a model server",
    locked: (done: number, all: number): string =>
      `Opens once every letter is unlocked (${done} of ${all}).`,
    field: "Topic",
    placeholder: "how vaccines work",
    start: "Start",
    next: "Next passage",
    stop: "Stop",
    learning: (topic: string): string => `Learning: ${topic}`,
    writing: "Writing a passage",
    failed:
      "The model could not write a passage. Check the model server in Settings.",
    passageTitle: (topic: string): string => `Topic · ${topic}`,
  },
  practice: {
    timeLeft: "Time left",
    startHint: "Start typing when ready",
    typeText: "Type the text",
    paused: "Click or press any key to continue",
    startOver: "Start over",
    connectKeyboard: "Connect a keyboard to practice",
  },
  intro: {
    title: (keys: string): string => `New keys: ${keys}`,
    note: "Rest your fingers on the home row. Feel for the bumps on F and J.",
    fingers: {
      L5: "Left little finger",
      L4: "Left ring finger",
      L3: "Left middle finger",
      L2: "Left index finger",
      R2: "Right index finger",
      R3: "Right middle finger",
      R4: "Right ring finger",
      R5: "Right little finger",
      T: "Thumb",
    } as Record<Finger, string>,
    home: "A home row key: the finger rests here.",
    thumb: "Press with either thumb.",
    reach: (
      from: string,
      rows: number,
      side: "straight" | "left" | "right",
    ): string => {
      const parts = [
        ...(rows === -2
          ? ["two rows up"]
          : rows === -1
            ? ["up"]
            : rows === 1
              ? ["down"]
              : []),
        ...(side === "straight" ? [] : [side]),
      ];
      return `From ${from}, reach ${parts.join(" and ")}.`;
    },
    shift: (left: boolean): string =>
      `Hold ${left ? "left" : "right"} Shift with the other hand.`,
    dead: (mark: string, shift: "left" | "right" | undefined): string =>
      `Press ${mark}${shift ? ` (with ${shift} Shift)` : ""} first, then this key.`,
    start: "Start drill",
    skip: "Skip",
    drillTitle: (keys: string): string => `Drill · ${keys}`,
  },
  summary: {
    label: "Session results",
    wpm: "Speed",
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
    sections: "Stats sections",
    overview: "Overview",
    keys: "Keys",
    pet: "Pet",
    totalTime: "Total time",
    lastWeek: "Last 7 days",
    daysOfWeek: (days: number): string => `${days} of 7 days`,
    time: (ms: number): string => {
      const minutes = Math.round(ms / 60_000);
      if (ms > 0 && minutes === 0) return "Under 1 min";
      return minutes < 60
        ? `${minutes} min`
        : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
    },
    lastSessions: (n: number): string =>
      n === 1 ? "Last session" : `Last ${n} sessions`,
    changeFrom: (change: string): string => `${change} vs the 10 before`,
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
    mostMissedNote:
      "Share of first tries on each key that went wrong, over all your practice. A key needs 10 tries.",
    loadFailed: "Stats could not be loaded. Reloading the page may help.",
    practice: "Practice",
    today: (ms: number): string => {
      const minutes = Math.round(ms / 60_000);
      if (ms === 0) return "Not practised yet today";
      return minutes === 0 ? "Today: under 1 min" : `Today: ${minutes} min`;
    },
    minutes: (n: number): string => `${n} min`,
    less: "Less",
    more: "More",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    dayTip: (minutes: number, sessions: number): string =>
      sessions === 0
        ? "No practice"
        : `${minutes === 0 ? "Under 1" : minutes} min · ${sessions} ${sessions === 1 ? "session" : "sessions"}`,
    monthSummary: (days: number, minutes: number): string =>
      `${days} ${days === 1 ? "day" : "days"} practised, ${minutes} min in total.`,
    weekStart: 0 as 0 | 1,
    spread: (days: number, minutes: number): string =>
      days === 0 ? "No practice" : `About ${minutes} min a day`,
    combinations: "Slowest letter combinations",
    combinationsEmpty:
      "Keep typing: combinations show after about 20 attempts each.",
    combinationsNote:
      "Ranked by total time lost, so common combinations come first. Change compares with your first 30 attempts at each, in ms.",
    pair: "Letters",
    msPerKey: "ms per key",
    pairChange: "Change",
    moves: "Moves between keys",
    move: "Move",
    earlier: "Earlier sessions, ms",
    recent: "Last 10 sessions, ms",
    moveNames: {
      hands: "Other hand",
      fingers: "Same hand, other finger",
      finger: "Same finger",
      repeat: "Same key",
    },
    movesNote:
      "In a study of 168,000 typists, times for letter pairs typed with alternating hands or one hand tracked overall speed more closely than repeated letters did. That is a link, not proof of cause.",
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
  danger: {
    title: "Danger zone",
    intro: "Delete everything Tenfold has saved on this device and start over.",
    delete: "Delete all data",
    confirmTitle: "Delete all your data?",
    confirmBody: (current: number): string =>
      `This removes your settings, your progress on every layout, ${sessions(current)}, your pet and your topic history.`,
    warning:
      "This cannot be undone. To keep a copy, export it first in Stats, under Your data.",
    confirm: "Delete everything",
    failed: "Could not delete your data. Nothing was removed.",
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
