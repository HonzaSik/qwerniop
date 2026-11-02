import { type DayPractice, dayKey } from "./practice";

const MINUTE = 60_000;
const DAY = 86_400_000;
/** More than this in a day counts for nothing: regular practice should beat one long session. */
export const DAILY_CAP_MS = 60 * MINUTE;
const HUNGRY_AFTER_DAYS = 4;
export const DIES_AFTER_DAYS = 14;

export const PET_STAGES = [
  "egg",
  "hatchling",
  "seedling",
  "sprout",
  "sapling",
  "bush",
  "bloom",
  "guardian",
] as const;
export type PetStage = (typeof PET_STAGES)[number];
export type PetMood = "content" | "hungry" | "dead";

// Bloom sits near the 35 hours that Baddeley & Longman's best group needed; see EVIDENCE.md.
const STAGE_FROM_MS: Record<PetStage, number> = {
  egg: 0,
  hatchling: 15 * MINUTE,
  seedling: 60 * MINUTE,
  sprout: 180 * MINUTE,
  sapling: 480 * MINUTE,
  bush: 1080 * MINUTE,
  bloom: 2100 * MINUTE,
  guardian: 6000 * MINUTE,
};

// Minutes at which each level starts: quick at first, then slower. Stages begin on levels 3, 5, 7, 10, 13, 17 and 20.
const LEVEL_FROM_MINUTES = [
  0, 5, 15, 30, 60, 120, 180, 270, 360, 480, 660, 840, 1080, 1320, 1560, 1800,
  2100, 2700, 3600, 6000,
] as const;
export const TOP_LEVEL = LEVEL_FROM_MINUTES.length;

export interface PetState {
  stage: PetStage;
  mood: PetMood;
  /** From 1 to TOP_LEVEL. */
  level: number;
  /** Share of the way through this level, from 0 to 1. */
  progress: number;
  /** Practice that counted towards growth, in whole minutes. */
  minutes: number;
  /** Minutes to the next level. Undefined at the top level, and for a dead pet, which grows no further. */
  toNext: number | undefined;
  /** Days since this pet's first practice. */
  ageDays: number;
  /** Days since the very first practice: a death does not reset them. */
  togetherDays: number;
  daysAway: number;
  /** Day key of the last practice. */
  lastPractised: string;
  /** Pets that died, including this one if it has. */
  lost: number;
}

// Counted from the date alone, so a daylight saving change cannot shift a gap by a day.
export const dayNumber = (key: string): number =>
  Date.UTC(
    Number(key.slice(0, 4)),
    Number(key.slice(5, 7)) - 1,
    Number(key.slice(8)),
  ) / DAY;

export const stageAt = (ms: number): PetStage =>
  PET_STAGES.filter((s) => ms >= STAGE_FROM_MS[s]).at(-1) ?? "egg";

/**
 * Worked out from practice history alone, so there is nothing extra to save, migrate or export.
 * Null until there is any practice.
 */
export function petState(
  days: ReadonlyMap<string, DayPractice>,
  today: number,
): PetState | null {
  const keys = [...days.keys()].sort();
  const last = keys.at(-1);
  const first = keys[0];
  if (last === undefined || first === undefined) return null;
  let lost = 0;
  let ms = 0;
  let born = dayNumber(last);
  let previous: number | undefined;
  for (const key of keys) {
    const day = dayNumber(key);
    if (previous === undefined || day - previous >= DIES_AFTER_DAYS) {
      if (previous !== undefined) lost++;
      ms = 0;
      born = day;
    }
    ms += Math.min(days.get(key)?.ms ?? 0, DAILY_CAP_MS);
    previous = day;
  }
  const now = dayNumber(dayKey(today));
  // A clock set back must not read as negative time away.
  const daysAway = Math.max(0, now - dayNumber(last));
  const mood: PetMood =
    daysAway >= DIES_AFTER_DAYS
      ? "dead"
      : daysAway >= HUNGRY_AFTER_DAYS
        ? "hungry"
        : "content";
  const stage = stageAt(ms);
  const level = LEVEL_FROM_MINUTES.filter((m) => ms >= m * MINUTE).length;
  const from = (LEVEL_FROM_MINUTES[level - 1] ?? 0) * MINUTE;
  const next = LEVEL_FROM_MINUTES[level];
  return {
    stage,
    mood,
    level,
    progress: next === undefined ? 1 : (ms - from) / (next * MINUTE - from),
    minutes: Math.floor(ms / MINUTE),
    toNext:
      mood === "dead" || next === undefined
        ? undefined
        : Math.ceil((next * MINUTE - ms) / MINUTE),
    ageDays: Math.max(0, (mood === "dead" ? dayNumber(last) : now) - born),
    togetherDays: Math.max(0, now - dayNumber(first)),
    daysAway,
    lastPractised: last,
    lost: lost + (mood === "dead" ? 1 : 0),
  };
}

export type PetMoment =
  | { kind: "reborn" }
  | { kind: "missed"; days: number }
  | { kind: "stage"; stage: PetStage }
  | { kind: "level"; level: number }
  | { kind: "speed"; wpm: number }
  | { kind: "key"; key: string }
  | { kind: "clean" };

/**
 * What this session meant to the pet, comparing it just before and just after.
 * Something the learner did for the first time outranks a level, which comes round anyway.
 */
export function petMoment(
  before: PetState | null,
  after: PetState,
  personal: PetMoment | null = null,
): PetMoment | null {
  if (before === null) return null;
  if (before.mood === "dead") return { kind: "reborn" };
  if (before.mood === "hungry")
    return { kind: "missed", days: before.daysAway };
  if (after.stage !== before.stage)
    return { kind: "stage", stage: after.stage };
  if (personal !== null) return personal;
  if (after.level > before.level) return { kind: "level", level: after.level };
  return null;
}
