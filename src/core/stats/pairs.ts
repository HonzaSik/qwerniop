import type { Keystroke } from "../engine/engine";
import type { SessionRecord } from "../engine/record";
import type { Layout } from "../layouts/layout";
import { fingerFor, strokesFor } from "../layouts/strokes";
import { average, isCount, isNonNegative, isRecord, MAX_GAP_MS } from "./chars";

/** Samples behind `earlyMs`: enough to smooth one bad session, few enough to reflect where a pair began. */
const EARLY_SAMPLES = 30;
/** Fewer samples than this say more about one moment than about the pair. */
const MIN_TIMED = 20;
/** Change is only worth showing once the moving average has moved on from the early samples. */
const MIN_TIMED_FOR_CHANGE = EARLY_SAMPLES + 10;
const SLOWEST_SHOWN = 10;
const SESSIONS_COMPARED = 10;
const MIN_TRANSITION_SAMPLES = 20;

const LOWERCASE_LETTER = /^\p{Ll}$/u;

export interface PairStat {
  /** The second letter's first attempts after a correct first letter. */
  attempts: number;
  correct: number;
  timed: number;
  totalMs: number;
  /** Moving average of the time from the first letter to the second. */
  ms: number;
  /** Mean of the first samples, kept so that progress can be read later. */
  earlyMs: number;
}

export type PairStats = Record<string, PairStat>;

/**
 * Each first attempt with the correct first attempt typed just before it. A wrong first
 * letter is left out, since what follows an error is timed by the error, not by the pair.
 */
function* adjacentAttempts(
  log: readonly Keystroke[],
): Generator<[Keystroke, Keystroke]> {
  const seen = new Set<number>();
  let before: Keystroke | undefined;
  for (const stroke of log) {
    const first = !seen.has(stroke.index);
    seen.add(stroke.index);
    if (first && before?.correct && before.index === stroke.index - 1) {
      yield [before, stroke];
    }
    before = first ? stroke : undefined;
  }
}

/** A dead-key letter's time holds two presses, which would rank its pairs falsely slow per key. */
const onePress = (layout: Layout, char: string): boolean =>
  strokesFor(layout, char)?.length === 1;

const timedOk = (stroke: Keystroke): boolean =>
  stroke.correct &&
  stroke.sincePrevious > 0 &&
  stroke.sincePrevious <= MAX_GAP_MS;

/** A new stats object with the session's letter pairs folded in. */
export function foldPairs(
  layout: Layout,
  stats: PairStats,
  log: readonly Keystroke[],
): PairStats {
  const out: PairStats = { ...stats };
  for (const [a, b] of adjacentAttempts(log)) {
    if (!LOWERCASE_LETTER.test(a.expected)) continue;
    if (!LOWERCASE_LETTER.test(b.expected)) continue;
    const pair = a.expected + b.expected;
    const old: PairStat = out[pair] ?? {
      attempts: 0,
      correct: 0,
      timed: 0,
      totalMs: 0,
      ms: 0,
      earlyMs: 0,
    };
    const next: PairStat = {
      ...old,
      attempts: old.attempts + 1,
      correct: old.correct + (b.correct ? 1 : 0),
    };
    if (timedOk(b) && onePress(layout, b.expected)) {
      next.timed = old.timed + 1;
      next.totalMs = old.totalMs + b.sincePrevious;
      next.ms = average(old.ms, old.timed, b.sincePrevious);
      if (next.timed <= EARLY_SAMPLES) next.earlyMs = next.totalMs / next.timed;
    }
    out[pair] = next;
  }
  return out;
}

function parsePair(raw: unknown): PairStat | null {
  if (!isRecord(raw)) return null;
  const { attempts, correct, timed, totalMs, ms, earlyMs } = raw;
  if (
    !isCount(attempts) ||
    !isCount(correct) ||
    !isCount(timed) ||
    !isNonNegative(totalMs) ||
    !isNonNegative(ms) ||
    !isNonNegative(earlyMs) ||
    correct > attempts
  ) {
    return null;
  }
  return { attempts, correct, timed, totalMs, ms, earlyMs };
}

/** Valid pairs from anything read from storage; a bad entry is dropped alone. */
export function parsePairs(raw: unknown): PairStats {
  const out: PairStats = {};
  if (!isRecord(raw)) return out;
  for (const [key, value] of Object.entries(raw)) {
    const letters = [...key];
    if (letters.length !== 2) continue;
    if (!letters.every((c) => LOWERCASE_LETTER.test(c))) continue;
    const stat = parsePair(value);
    if (stat) out[key] = stat;
  }
  return out;
}

function median(sorted: readonly number[]): number {
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1
    ? (sorted[mid] ?? 0)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

export interface SlowPair {
  pair: string;
  ms: number;
  accuracy: number;
  /** Milliseconds since `earlyMs`, negative when faster; undefined with too few samples to say. */
  change: number | undefined;
}

/** Ranked by total time lost against the learner's own median, so a common pair outranks a rare slower one. */
export function slowestPairs(stats: PairStats): SlowPair[] {
  const known = Object.entries(stats).filter(([, s]) => s.timed >= MIN_TIMED);
  const typical = median(known.map(([, s]) => s.ms).sort((a, b) => a - b));
  return known
    .map(([pair, s]) => ({ pair, s, lost: s.timed * (s.ms - typical) }))
    .filter(({ lost }) => lost > 0)
    .sort((a, b) => b.lost - a.lost)
    .slice(0, SLOWEST_SHOWN)
    .map(({ pair, s }) => ({
      pair,
      ms: s.ms,
      accuracy: s.correct / s.attempts,
      change: s.timed >= MIN_TIMED_FOR_CHANGE ? s.ms - s.earlyMs : undefined,
    }));
}

export const TRANSITIONS = ["hands", "fingers", "finger", "repeat"] as const;
export type Transition = (typeof TRANSITIONS)[number];

/** Total time and count per kind of move, for one session. */
export type TransitionTimes = Partial<
  Record<Transition, { ms: number; count: number }>
>;

/** Only one plain keypress each way: Shift and dead keys would time something other than the move between fingers. */
function plainFinger(layout: Layout, char: string) {
  const strokes = strokesFor(layout, char);
  const stroke = strokes?.length === 1 ? strokes[0] : undefined;
  return stroke && stroke.shift === null
    ? fingerFor(layout, stroke.code)
    : undefined;
}

export function transitionTimes(
  layout: Layout,
  log: readonly Keystroke[],
): TransitionTimes {
  const out: TransitionTimes = {};
  for (const [a, b] of adjacentAttempts(log)) {
    if (!timedOk(b)) continue;
    if (!LOWERCASE_LETTER.test(a.expected)) continue;
    if (!LOWERCASE_LETTER.test(b.expected)) continue;
    const from = plainFinger(layout, a.expected);
    const to = plainFinger(layout, b.expected);
    if (from === undefined || to === undefined) continue;
    const kind: Transition =
      a.expected === b.expected
        ? "repeat"
        : from === to
          ? "finger"
          : from.charAt(0) === to.charAt(0)
            ? "fingers"
            : "hands";
    const old = out[kind] ?? { ms: 0, count: 0 };
    out[kind] = { ms: old.ms + b.sincePrevious, count: old.count + 1 };
  }
  return out;
}

/** Stored values are unchecked; a bad entry is dropped alone. */
export function parseTransitionTimes(raw: unknown): TransitionTimes {
  const out: TransitionTimes = {};
  if (!isRecord(raw)) return out;
  for (const kind of TRANSITIONS) {
    const entry = raw[kind];
    if (isRecord(entry) && isNonNegative(entry.ms) && isCount(entry.count)) {
      out[kind] = { ms: entry.ms, count: entry.count };
    }
  }
  return out;
}

export interface TransitionRow {
  kind: Transition;
  recent: number;
  earlier: number | undefined;
}

function meanOver(
  records: readonly SessionRecord[],
  kind: Transition,
): number | undefined {
  let ms = 0;
  let count = 0;
  for (const r of records) {
    ms += r.transitions?.[kind]?.ms ?? 0;
    count += r.transitions?.[kind]?.count ?? 0;
  }
  return count >= MIN_TRANSITION_SAMPLES ? ms / count : undefined;
}

/** Mean time per move in the newest sessions of a layout, against the sessions just before them. */
export function transitionSummary(
  records: readonly SessionRecord[],
  layout: Layout["id"],
): TransitionRow[] {
  const measured = records
    // A session with no letter pairs, such as numbers, has nothing to compare and must not use up the window.
    .filter(
      (r) =>
        r.layout === layout &&
        r.transitions !== undefined &&
        Object.keys(r.transitions).length > 0,
    )
    .sort((a, b) => a.at - b.at);
  const recent = measured.slice(-SESSIONS_COMPARED);
  const earlier = measured.slice(-2 * SESSIONS_COMPARED, -SESSIONS_COMPARED);
  return TRANSITIONS.flatMap((kind) => {
    const now = meanOver(recent, kind);
    return now === undefined
      ? []
      : [{ kind, recent: now, earlier: meanOver(earlier, kind) }];
  });
}
