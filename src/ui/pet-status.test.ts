import { expect, test } from "vitest";
import type { SessionRecord } from "../core/engine/record";
import { petStatus } from "./pet-status";

const record = (at: number): SessionRecord => ({
  at,
  layout: "en-us",
  mode: "stop",
  lesson: { track: "letters", stage: 1 },
  wpm: 30,
  accuracy: 1,
  durationMs: 60_000,
  errors: {},
});

test("is null before the first session", () => {
  expect(petStatus([], Date.now())).toBeNull();
});

test("gives the pet and the streak from the same history", () => {
  const day = (d: number) => new Date(2026, 2, d, 12).getTime();
  const status = petStatus([record(day(9)), record(day(10))], day(10));
  expect(status?.streak).toEqual({ current: 2, best: 2 });
  expect(status?.pet.minutes).toBe(2);
});
