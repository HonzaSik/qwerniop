import type { SessionRecord } from "../core/engine/record";
import { type PetState, petState } from "../core/stats/pet";
import { practiceByDay } from "../core/stats/practice";

/** The pet after a session; the write may still be queued, and it should already count this session. */
export const summaryPet = (
  saved: readonly SessionRecord[],
  record: SessionRecord,
): PetState | null =>
  petState(
    practiceByDay(
      saved.some((r) => r.at === record.at) ? saved : [...saved, record],
    ),
    record.at,
  );
