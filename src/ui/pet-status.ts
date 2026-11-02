import type { SessionRecord } from "../core/engine/record";
import { type PetState, petState } from "../core/stats/pet";
import {
  practiceByDay,
  practiceStreak,
  type Streak,
} from "../core/stats/practice";

export interface PetStatus {
  pet: PetState;
  streak: Streak;
}

/** The pet and the streak from the history; null before the first session. */
export function petStatus(
  records: readonly SessionRecord[],
  now: number,
): PetStatus | null {
  const days = practiceByDay(records);
  const pet = petState(days, now);
  return pet && { pet, streak: practiceStreak(days, now) };
}
