import { describe, expect, test } from "vitest";
import type { SessionRecord } from "../core/engine/record";
import { summaryPet } from "./pet-summary";

const record = (at: number): SessionRecord => ({
  at,
  layout: "en-us",
  mode: "stop",
  lesson: { track: "letters", stage: 1 },
  wpm: 30,
  accuracy: 1,
  durationMs: 600_000,
  errors: {},
});

describe("summaryPet", () => {
  const now = new Date(2026, 2, 1, 12).getTime();

  test("counts a session whose write is still queued", () => {
    expect(summaryPet([], record(now))?.state.minutes).toBe(10);
  });

  test("compares with the pet as it was before this session", () => {
    const earlier = record(now - 6 * 86_400_000);
    expect(summaryPet([earlier], record(now))?.moment).toEqual({
      kind: "missed",
      days: 6,
    });
    expect(summaryPet([], record(now))?.moment).toBeNull();
  });

  test("does not count a session twice once it is saved", () => {
    expect(summaryPet([record(now)], record(now))?.state.minutes).toBe(10);
  });
});
