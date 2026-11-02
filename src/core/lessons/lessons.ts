import { type Targets, weakness } from "../adaptive/weakness";
import type { Layout } from "../layouts/layout";
import { type CharStats, isRecord, parseCharStats } from "../stats/chars";
import { type PairStats, parsePairs } from "../stats/pairs";
import { stageCount, unlockedLetters } from "./letters";
import {
  type Track,
  trackChars,
  trackStages,
  tracksOpen,
  tracksStart,
} from "./tracks";

export type LessonTrack = "letters" | Track;

/** A lesson is one stage of one track; stages count from 1. */
export interface Lesson {
  track: LessonTrack;
  stage: number;
}

/** Stages unlocked per track, the per-character stats and the lesson last chosen. */
export type Progress = Record<LessonTrack, number> & {
  stats: CharStats;
  pairs: PairStats;
  lesson: Lesson;
  /** Highest stage per track whose new keys have been introduced; 0 is none. */
  introduced: Record<LessonTrack, number>;
};

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
  stats: {},
  pairs: {},
  lesson: { track: "letters", stage: 1 },
  introduced: { letters: 0, punctuation: 0, numbers: 0, code: 0 },
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

/**
 * The letter stage a lesson's text draws from. Unlocked lessons use what is unlocked;
 * a locked one, started in developer mode, uses the letters it would have when reached.
 */
export function lessonLetterStage(
  id: Layout["id"],
  progress: Progress,
  lesson: Lesson,
): number {
  const needed =
    lesson.track === "letters" ? lesson.stage : (tracksStart(id) ?? 1);
  return Math.max(progress.letters, needed);
}

/** Unlocks the next stage of the lesson's track when every character unlocked there meets the targets; at most one stage per call. */
export function completeLesson(
  id: Layout["id"],
  progress: Progress,
  lesson: Lesson,
  targets: Targets,
): Progress {
  if (!isUnlocked(id, progress, lesson)) return progress;
  const { track } = lesson;
  const stage = progress[track];
  if (stage >= lessonCount(id, track)) return progress;
  const chars =
    track === "letters"
      ? (unlockedLetters(id, stage) ?? "")
      : trackChars(track, stage);
  return [...chars].every((c) => weakness(progress.stats[c], targets) === 0)
    ? { ...progress, [track]: stage + 1 }
    : progress;
}

/**
 * The following stage of the same track, if it can be started; otherwise the same lesson again with new text.
 * The last stage stays where it is. In developer mode locked stages can be started too.
 */
export function nextLesson(
  id: Layout["id"],
  progress: Progress,
  lesson: Lesson,
  anyLesson: boolean,
): Lesson {
  const next = {
    track: lesson.track,
    stage: Math.min(lesson.stage + 1, lessonCount(id, lesson.track)),
  };
  return anyLesson || isUnlocked(id, progress, next) ? next : lesson;
}

export type NoNewKeys = "capitals" | "snippets";

// Stages that add no typable symbol: capitals need Shift only, code stage 4 adds Enter.
export function noNewKeys(lesson: Lesson): NoNewKeys | undefined {
  if (lesson.track === "punctuation" && lesson.stage === 1) return "capitals";
  if (lesson.track === "code" && lesson.stage === 4) return "snippets";
  return undefined;
}

/** The characters this stage adds over the one before it, spaced. */
export function lessonKeys(id: Layout["id"], lesson: Lesson): string {
  const upTo = (stage: number) =>
    lesson.track === "letters"
      ? (unlockedLetters(id, stage) ?? "")
      : trackChars(lesson.track, stage);
  return [...upTo(lesson.stage).slice(upTo(lesson.stage - 1).length)].join(" ");
}

const isLessonTrack = (v: string): v is LessonTrack =>
  TRACKS.some((t) => t === v);

/** Valid Progress from anything read from storage; each track falls back to 1 alone and is clamped to its stage count. */
export function parseProgress(id: Layout["id"], raw: unknown): Progress {
  const out = initialProgress();
  if (!isRecord(raw)) return out;
  for (const track of TRACKS) {
    const v = raw[track];
    if (typeof v === "number" && Number.isInteger(v) && v >= 1) {
      out[track] = Math.min(v, lessonCount(id, track));
    }
  }
  out.stats = parseCharStats(raw.stats);
  out.pairs = parsePairs(raw.pairs);
  // Records from before introductions existed count every unlocked stage as seen,
  // so someone mid-course is not walked back through keys they already know.
  const seen = isRecord(raw.introduced) ? raw.introduced : undefined;
  for (const track of TRACKS) {
    const v = seen?.[track];
    out.introduced[track] =
      typeof v === "number" && Number.isInteger(v) && v >= 0
        ? Math.min(v, lessonCount(id, track))
        : out[track];
  }
  const l = raw.lesson;
  if (
    isRecord(l) &&
    typeof l.track === "string" &&
    typeof l.stage === "number" &&
    Number.isInteger(l.stage)
  ) {
    const lesson = { track: l.track, stage: l.stage };
    // A saved lesson that is no longer unlocked would start text the person cannot reach.
    if (
      isLessonTrack(lesson.track) &&
      isUnlocked(id, out, { ...lesson, track: lesson.track })
    ) {
      out.lesson = { ...lesson, track: lesson.track };
    }
  }
  return out;
}
