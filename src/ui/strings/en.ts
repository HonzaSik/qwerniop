import type { ExportError } from "../../core/export/export";
import type { Layout } from "../../core/layouts/layout";
import type { LessonTrack, NoNewKeys } from "../../core/lessons/lessons";
import type { KeyboardMode } from "../../core/settings/settings";

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
  },
  layoutLabel: "Layout",
  layoutNames: {
    "en-us": "English (US)",
    "cs-qwertz": "Czech (QWERTZ)",
  } as Record<Layout["id"], string>,
  lengthLabel: "Length",
  words: (n: number): string => `${n} words`,
  seconds: (n: number): string => `${n} s`,
  keyboardLabel: "Keyboard",
  keyboardModes: {
    fingers: "Finger colours",
    next: "Next key only",
    hidden: "Hidden",
  } as Record<KeyboardMode, string>,
  wordListError: "The word list could not be loaded.",
  tryAgain: "Try again",
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
  },
  summary: {
    label: "Session results",
    wpm: "WPM",
    accuracy: "Accuracy",
    time: "Time",
    weakest: "Weakest keys",
    next: "Continue",
    repeat: "Repeat",
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
