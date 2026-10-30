import type { Layout } from "../layouts/layout";
import { stageCount, unlockedLetters } from "./letters";
import { type Track, trackChars, trackStages, tracksOpen } from "./tracks";

export type LessonTrack = "letters" | Track;

/** A lesson is one stage of one track; stages count from 1. */
export interface Lesson {
  track: LessonTrack;
  stage: number;
}

/** Stages unlocked per track. Interim rule until the adaptive unlock (milestone 7): finishing a lesson unlocks the next one in its track. */
export type Progress = Record<LessonTrack, number>;

export const TRACKS: readonly LessonTrack[] = [
  "letters",
  "punctuation",
  "numbers",
  "code",
];

export const initialProgress = (): Progress => ({
  letters: 1,
  punctuation: 1,
  numbers: 1,
  code: 1,
});

export function lessonCount(id: Layout["id"], track: LessonTrack): number {
  return track === "letters" ? stageCount(id) : trackStages(track);
}

export function isUnlocked(
  id: Layout["id"],
  progress: Progress,
  lesson: Lesson,
): boolean {
  if (lesson.stage < 1 || lesson.stage > lessonCount(id, lesson.track)) {
    return false;
  }
  if (lesson.track === "letters") return lesson.stage <= progress.letters;
  return (
    tracksOpen(id, progress.letters) && lesson.stage <= progress[lesson.track]
  );
}

export function completeLesson(
  id: Layout["id"],
  progress: Progress,
  lesson: Lesson,
): Progress {
  if (!isUnlocked(id, progress, lesson)) return progress;
  const unlocked = Math.min(
    Math.max(progress[lesson.track], lesson.stage + 1),
    lessonCount(id, lesson.track),
  );
  return { ...progress, [lesson.track]: unlocked };
}

/** The following stage of the same track; the last stage stays where it is and gets new text. */
export function nextLesson(id: Layout["id"], lesson: Lesson): Lesson {
  return {
    track: lesson.track,
    stage: Math.min(lesson.stage + 1, lessonCount(id, lesson.track)),
  };
}

// Stages that add no typable symbol: capitals need Shift only, code stage 4 adds Enter.
const NO_NEW_KEYS: Record<string, string> = {
  "punctuation 1": "capitals",
  "code 4": "whole snippets",
};

/** What this lesson adds over the one before it, for display: spaced characters, or a note. */
export function lessonKeys(id: Layout["id"], lesson: Lesson): string {
  const upTo = (stage: number) =>
    lesson.track === "letters"
      ? (unlockedLetters(id, stage) ?? "")
      : trackChars(lesson.track, stage);
  const added = upTo(lesson.stage).slice(upTo(lesson.stage - 1).length);
  return (
    [...added].join(" ") ||
    (NO_NEW_KEYS[`${lesson.track} ${lesson.stage}`] ?? "")
  );
}

export const TRACK_NAMES: Record<LessonTrack, string> = {
  letters: "Letters",
  punctuation: "Punctuation",
  numbers: "Numbers",
  code: "Code",
};

/** "Lesson 5 · e i" for letters, "Numbers 2 · 6 7 8 9 0" for the other tracks. */
export function lessonTitle(id: Layout["id"], lesson: Lesson): string {
  const keys = lessonKeys(id, lesson);
  const noun =
    lesson.track === "letters" ? "Lesson" : TRACK_NAMES[lesson.track];
  return `${noun} ${lesson.stage}${keys ? ` · ${keys}` : ""}`;
}
