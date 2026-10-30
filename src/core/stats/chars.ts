import type { Keystroke } from "../engine/engine";

/** Weight of the newest sample in each moving average. */
const ALPHA = 0.1;
/** A longer gap is hesitation, not speed. */
const MAX_GAP_MS = 2000;

export interface CharStat {
  /** First keystrokes at a text position; retries are not attempts. */
  attempts: number;
  correct: number;
  /** Moving average of 1 or 0 per attempt, from 0 to 1. */
  accuracy: number;
  /** Time samples taken, and their sum. */
  timed: number;
  totalMs: number;
  /** Moving average of the time to press; meaningless while `timed` is 0. */
  ms: number;
}

export type CharStats = Record<string, CharStat>;

const average = (old: number, count: number, x: number): number =>
  count === 0 ? x : old + ALPHA * (x - old);

/** A new stats object with the session's first attempts folded in, in log order. */
export function foldSession(
  stats: CharStats,
  log: readonly Keystroke[],
): CharStats {
  const out: CharStats = { ...stats };
  const seen = new Set<number>();
  for (const stroke of log) {
    if (seen.has(stroke.index)) continue;
    seen.add(stroke.index);
    const old: CharStat = out[stroke.expected] ?? {
      attempts: 0,
      correct: 0,
      accuracy: 0,
      timed: 0,
      totalMs: 0,
      ms: 0,
    };
    const next: CharStat = {
      ...old,
      attempts: old.attempts + 1,
      correct: old.correct + (stroke.correct ? 1 : 0),
      accuracy: average(old.accuracy, old.attempts, stroke.correct ? 1 : 0),
    };
    // A wrong first attempt has no meaningful time to press, and the session's first key has no previous one.
    if (
      stroke.correct &&
      stroke.sincePrevious > 0 &&
      stroke.sincePrevious <= MAX_GAP_MS
    ) {
      next.ms = average(old.ms, old.timed, stroke.sincePrevious);
      next.timed = old.timed + 1;
      next.totalMs = old.totalMs + stroke.sincePrevious;
    }
    out[stroke.expected] = next;
  }
  return out;
}

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;
const isNonNegative = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

function parseStat(raw: unknown): CharStat | null {
  if (!isRecord(raw)) return null;
  const { attempts, correct, accuracy, timed, totalMs, ms } = raw;
  if (
    !isCount(attempts) ||
    !isCount(correct) ||
    !isCount(timed) ||
    !isNonNegative(totalMs) ||
    !isNonNegative(ms) ||
    !isNonNegative(accuracy) ||
    correct > attempts ||
    accuracy > 1
  ) {
    return null;
  }
  return { attempts, correct, accuracy, timed, totalMs, ms };
}

/** Valid CharStats from anything read from storage; a bad entry or a key that is not one character is dropped alone. */
export function parseCharStats(raw: unknown): CharStats {
  const out: CharStats = {};
  if (!isRecord(raw)) return out;
  for (const [key, value] of Object.entries(raw)) {
    if ([...key].length !== 1) continue;
    const stat = parseStat(value);
    if (stat) out[key] = stat;
  }
  return out;
}
