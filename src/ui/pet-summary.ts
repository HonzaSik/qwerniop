import type { SessionRecord } from "../core/engine/record";
import {
  type PetMoment,
  type PetState,
  petMoment,
  petState,
} from "../core/stats/pet";
import { practiceByDay } from "../core/stats/practice";

export interface SummaryPet {
  state: PetState;
  moment: PetMoment | null;
}

/** The pet after a session and what changed; the write may still be queued, so the session is added here if missing. */
export function summaryPet(
  saved: readonly SessionRecord[],
  record: SessionRecord,
): SummaryPet | null {
  const others = saved.filter((r) => r.at !== record.at);
  const state = petState(practiceByDay([...others, record]), record.at);
  if (state === null) return null;
  const before = petState(practiceByDay(others), record.at);
  return { state, moment: petMoment(before, state) };
}
