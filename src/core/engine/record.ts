import type { Layout } from "../layouts/layout";
import { type LessonTrack, TRACKS } from "../lessons/lessons";
import { parseTransitionTimes, type TransitionTimes } from "../stats/pairs";
import type { Session } from "./engine";
import { accuracy, duration, netWpm } from "./results";

/** What is kept of a finished session; the keystroke log is folded away. */
export interface SessionRecord {
  /** Epoch milliseconds when the session finished. */
  at: number;
  layout: Layout["id"];
  mode: Session["config"]["errorMode"];
  /** "custom" is pasted text: it belongs to no track, and stage is 0. */
  lesson: { track: LessonTrack | "custom"; stage: number };
  wpm: number;
  accuracy: number;
  durationMs: number;
  /** Wrong keystrokes per expected character. */
  errors: Record<string, number>;
  /** Time by kind of move between fingers; absent on sessions from before it was measured. */
  transitions?: TransitionTimes;
}

export function sessionRecord(
  session: Session,
  layout: Layout["id"],
  lesson: SessionRecord["lesson"],
  at: number,
): SessionRecord {
  const errors: Record<string, number> = {};
  for (const stroke of session.log) {
    if (!stroke.correct) {
      errors[stroke.expected] = (errors[stroke.expected] ?? 0) + 1;
    }
  }
  return {
    at,
    layout,
    mode: session.config.errorMode,
    lesson: { track: lesson.track, stage: lesson.stage },
    wpm: netWpm(session),
    accuracy: accuracy(session),
    durationMs: duration(session),
    errors,
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;
const isFiniteNonNeg = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

/** Stored records are unchecked; null means drop it. Never throws. */
export function parseSessionRecord(value: unknown): SessionRecord | null {
  if (!isRecord(value)) return null;
  const { at, layout, mode, lesson, wpm, accuracy, durationMs, errors } = value;
  const { transitions } = value;
  if (!isFiniteNonNeg(at) || !isFiniteNonNeg(wpm)) return null;
  if (!isFiniteNonNeg(durationMs)) return null;
  if (!isFiniteNonNeg(accuracy) || accuracy > 1) return null;
  if (layout !== "en-us" && layout !== "cs-qwertz") return null;
  if (mode !== "stop" && mode !== "continue") return null;
  if (!isRecord(lesson) || !isCount(lesson.stage)) return null;
  const track =
    lesson.track === "custom"
      ? "custom"
      : TRACKS.find((t) => t === lesson.track);
  if (!track || !isRecord(errors)) return null;
  const clean: Record<string, number> = {};
  for (const [char, n] of Object.entries(errors)) {
    if (!isCount(n)) return null;
    clean[char] = n;
  }
  return {
    at,
    layout,
    mode,
    lesson: { track, stage: lesson.stage },
    wpm,
    accuracy,
    durationMs,
    errors: clean,
    ...(transitions === undefined
      ? {}
      : { transitions: parseTransitionTimes(transitions) }),
  };
}
