import type { Layout } from "../layouts/layout";
import type { LessonTrack } from "../lessons/lessons";
import type { Session } from "./engine";
import { accuracy, duration, netWpm } from "./results";

/** What is kept of a finished session; the keystroke log is folded away. */
export interface SessionRecord {
  /** Epoch milliseconds when the session finished. */
  at: number;
  layout: Layout["id"];
  mode: Session["config"]["errorMode"];
  lesson: { track: LessonTrack; stage: number };
  wpm: number;
  accuracy: number;
  durationMs: number;
  /** Wrong first-attempts per expected character. */
  errors: Record<string, number>;
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
