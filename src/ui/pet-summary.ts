import type { SessionRecord } from "../core/engine/record";
import {
  type PetMoment,
  type PetState,
  petMoment,
  petState,
} from "../core/stats/pet";
import { personalMoment } from "../core/stats/pet-memories";
import { practiceByDay } from "../core/stats/practice";

export interface SummaryPet {
  state: PetState;
  moment: PetMoment | null;
  /** Good news, so the pet shows it too; coming back after a loss or a long gap is not a party. */
  cheer: boolean;
}

/** The pet after a session and what changed; the write may still be queued, so the session is added here if missing. */
export function summaryPet(
  saved: readonly SessionRecord[],
  record: SessionRecord,
  typed: readonly string[],
): SummaryPet | null {
  const others = saved.filter((r) => r.at !== record.at);
  const state = petState(practiceByDay([...others, record]), record.at);
  if (state === null) return null;
  const before = petState(practiceByDay(others), record.at);
  const moment = petMoment(
    before,
    state,
    personalMoment(others, record, typed),
  );
  return {
    state,
    moment,
    cheer:
      moment !== null && moment.kind !== "reborn" && moment.kind !== "missed",
  };
}
