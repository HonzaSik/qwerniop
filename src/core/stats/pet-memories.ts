import type { SessionRecord } from "../engine/record";
import {
  DAILY_CAP_MS,
  DIES_AFTER_DAYS,
  type PetMoment,
  type PetStage,
  stageAt,
} from "./pet";
import { dayKey, dayNumber } from "./practice";

/** Shorter than this says little: a few lucky seconds should not be a record. */
const MIN_RECORD_MS = 20_000;
const MIN_RECORD_ACCURACY = 0.9;
/** Every first session would be a personal best otherwise. */
const SPEED_AFTER_SESSIONS = 5;
const SPEED_STEP = 10;
const FIRST_SPEED = 20;
const KEY_WINDOW = 5;
const KEY_MISSED_IN = 3;
const KEY_MIN_TYPED = 5;

const fairSpeed = (r: SessionRecord): boolean =>
  r.durationMs >= MIN_RECORD_MS && r.accuracy >= MIN_RECORD_ACCURACY;
const clean = (r: SessionRecord): boolean =>
  r.durationMs >= MIN_RECORD_MS && r.accuracy === 1;

type PetEvent =
  | { kind: "met" }
  | { kind: "stage"; stage: PetStage }
  | { kind: "lost" }
  | { kind: "back" }
  | { kind: "speed"; wpm: number }
  | { kind: "clean" };

export type PetMemory = PetEvent & { day: number };

/** The shared history, oldest first. `day` counts from 1 at the very first practice. */
export function petMemories(
  records: readonly SessionRecord[],
  today: number,
): PetMemory[] {
  const sorted = [...records].sort((a, b) => a.at - b.at);
  const first = sorted[0];
  if (first === undefined) return [];
  const start = dayNumber(dayKey(first.at));
  const memories: PetMemory[] = [];
  const add = (day: number, event: PetEvent): void => {
    memories.push({ ...event, day: day - start + 1 });
  };
  add(start, { kind: "met" });
  let previous = start;
  let dayMs = 0;
  let ms = 0;
  let stage: PetStage = "egg";
  let speed = 0;
  let wasClean = false;
  for (const r of sorted) {
    const day = dayNumber(dayKey(r.at));
    if (day - previous >= DIES_AFTER_DAYS) {
      add(previous + DIES_AFTER_DAYS, { kind: "lost" });
      add(day, { kind: "back" });
      ms = 0;
      stage = "egg";
    }
    if (day !== previous) dayMs = 0;
    previous = day;
    const counted = Math.min(r.durationMs, DAILY_CAP_MS - dayMs);
    dayMs += counted;
    ms += counted;
    const reached = stageAt(ms);
    if (reached !== stage) {
      stage = reached;
      add(day, { kind: "stage", stage });
    }
    const step = Math.floor(r.wpm / SPEED_STEP) * SPEED_STEP;
    if (fairSpeed(r) && step >= FIRST_SPEED && step > speed) {
      speed = step;
      add(day, { kind: "speed", wpm: step });
    }
    if (!wasClean && clean(r)) {
      wasClean = true;
      add(day, { kind: "clean" });
    }
  }
  if (dayNumber(dayKey(today)) - previous >= DIES_AFTER_DAYS) {
    add(previous + DIES_AFTER_DAYS, { kind: "lost" });
  }
  return memories;
}

/**
 * What the learner did this session that the pet can react to: a personal best,
 * a key that kept going wrong and went right, or a first session with no mistakes.
 * `typed` is the expected characters reached: a key missing from `errors` proves nothing unless it came up.
 */
export function personalMoment(
  others: readonly SessionRecord[],
  record: SessionRecord,
  typed: readonly string[],
): PetMoment | null {
  const earlier = others
    .filter((r) => r.layout === record.layout)
    .sort((a, b) => a.at - b.at);
  const fair = earlier.filter(fairSpeed);
  const wpm = Math.round(record.wpm);
  if (
    fairSpeed(record) &&
    fair.length >= SPEED_AFTER_SESSIONS &&
    fair.every((r) => Math.round(r.wpm) < wpm)
  ) {
    return { kind: "speed", wpm };
  }
  const key = beatenKey(earlier.slice(-KEY_WINDOW), record, typed);
  if (key !== undefined) return { kind: "key", key };
  if (others.length > 0 && clean(record) && !others.some(clean)) {
    return { kind: "clean" };
  }
  return null;
}

function beatenKey(
  recent: readonly SessionRecord[],
  record: SessionRecord,
  typed: readonly string[],
): string | undefined {
  // Only straight after a miss, so one improvement is not told twice.
  const missedLast = Object.keys(recent.at(-1)?.errors ?? {});
  let best: string | undefined;
  let bestErrors = 0;
  for (const key of missedLast.sort()) {
    if (key.trim() === "" || (record.errors[key] ?? 0) > 0) continue;
    if (typed.filter((c) => c === key).length < KEY_MIN_TYPED) continue;
    const missed = recent.filter((r) => (r.errors[key] ?? 0) > 0);
    if (missed.length < KEY_MISSED_IN) continue;
    const errors = missed.reduce((sum, r) => sum + (r.errors[key] ?? 0), 0);
    if (errors > bestErrors) {
      best = key;
      bestErrors = errors;
    }
  }
  return best;
}
