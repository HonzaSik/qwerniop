import { describe, expect, test } from "vitest";
import type { SessionRecord } from "../engine/record";
import { petState } from "./pet";
import { personalMoment, petMemories } from "./pet-memories";
import { practiceByDay } from "./practice";

const DAY = 86_400_000;
const start = new Date(2026, 2, 1, 12).getTime();

const record = (
  day: number,
  over: Partial<SessionRecord> = {},
): SessionRecord => ({
  at: start + day * DAY,
  layout: "en-us",
  mode: "stop",
  lesson: { track: "letters", stage: 1 },
  wpm: 15,
  accuracy: 0.95,
  durationMs: 60_000,
  errors: {},
  ...over,
});

describe("petMemories", () => {
  test("nothing without practice", () => {
    expect(petMemories([], start)).toEqual([]);
  });

  test("starts at day 1 with finding the egg, in any stored order", () => {
    const got = petMemories([record(3), record(0)], start + 3 * DAY);
    expect(got).toEqual([{ kind: "met", day: 1 }]);
  });

  test("a stage is remembered once, on the day it was reached", () => {
    const long = { durationMs: 20 * 60_000 };
    const got = petMemories(
      [record(0, long), record(2, long), record(4, long)],
      start + 4 * DAY,
    );
    expect(got.filter((m) => m.kind === "stage")).toEqual([
      { kind: "stage", stage: "hatchling", day: 1 },
      { kind: "stage", stage: "seedling", day: 5 },
    ]);
  });

  test("the daily cap applies, and agrees with petState", () => {
    const records = [
      record(0, { durationMs: 50 * 60_000 }),
      record(0, { durationMs: 50 * 60_000 }),
      record(1, { durationMs: 70 * 60_000 }),
    ];
    const stages = petMemories(records, start + DAY).filter(
      (m) => m.kind === "stage",
    );
    expect(stages.at(-1)).toMatchObject({ stage: "seedling", day: 1 });
    expect(petState(practiceByDay(records), start + DAY)?.minutes).toBe(120);
  });

  test("a death and the new egg, with growth starting over", () => {
    const long = { durationMs: 20 * 60_000 };
    const got = petMemories(
      [record(0, long), record(20, long)],
      start + 20 * DAY,
    );
    expect(got).toEqual([
      { kind: "met", day: 1 },
      { kind: "stage", stage: "hatchling", day: 1 },
      { kind: "lost", day: 15 },
      { kind: "back", day: 21 },
      { kind: "stage", stage: "hatchling", day: 21 },
    ]);
  });

  test("a pet that is dead now is remembered as lost, on day 15", () => {
    const got = petMemories([record(0)], start + 30 * DAY);
    expect(got.at(-1)).toEqual({ kind: "lost", day: 15 });
  });

  test("speed steps of ten from 20 wpm, first time only, fair sessions only", () => {
    const got = petMemories(
      [
        record(0, { wpm: 25 }),
        record(1, { wpm: 28 }),
        record(2, { wpm: 45 }),
        record(3, { wpm: 90, accuracy: 0.5 }),
        record(4, { wpm: 90, durationMs: 5_000 }),
      ],
      start + 4 * DAY,
    );
    expect(got.filter((m) => m.kind === "speed")).toEqual([
      { kind: "speed", wpm: 20, day: 1 },
      { kind: "speed", wpm: 40, day: 3 },
    ]);
  });

  test("the first clean session is remembered once", () => {
    const got = petMemories(
      [
        record(0, { accuracy: 1, durationMs: 5_000 }),
        record(1, { accuracy: 1 }),
        record(2, { accuracy: 1 }),
      ],
      start + 2 * DAY,
    );
    expect(got.filter((m) => m.kind === "clean")).toEqual([
      { kind: "clean", day: 2 },
    ]);
  });
});

describe("personalMoment", () => {
  const five = [0, 1, 2, 3, 4].map((day) => record(day, { wpm: 30 }));

  test("a personal best on this layout, once there are five sessions to beat", () => {
    expect(personalMoment(five, record(5, { wpm: 31.4 }), [])).toEqual({
      kind: "speed",
      wpm: 31,
    });
    expect(
      personalMoment(five.slice(1), record(5, { wpm: 99 }), []),
    ).toBeNull();
  });

  test("a tie after rounding is no record", () => {
    expect(personalMoment(five, record(5, { wpm: 30.4 }), [])).toBeNull();
  });

  test("an unfair session is no record and sets none", () => {
    expect(
      personalMoment(five, record(5, { wpm: 99, accuracy: 0.5 }), []),
    ).toBeNull();
    const withFluke = [...five, record(5, { wpm: 99, durationMs: 1_000 })];
    expect(personalMoment(withFluke, record(6, { wpm: 31 }), [])).toEqual({
      kind: "speed",
      wpm: 31,
    });
  });

  test("other layouts do not count towards a record", () => {
    const other = five.map((r) => ({ ...r, layout: "cs-qwertz" as const }));
    expect(personalMoment(other, record(5, { wpm: 99 }), [])).toBeNull();
  });

  const missing = (key: string) => ({ errors: { [key]: 2 } });
  const recent = [
    record(0, missing("f")),
    record(1),
    record(2, missing("f")),
    record(3, missing("f")),
  ];
  const typed = [..."fffff"];

  test("a key missed in three of five, last time too, and now clean", () => {
    expect(personalMoment(recent, record(4), typed)).toEqual({
      kind: "key",
      key: "f",
    });
  });

  test("not when the key barely came up, so absence is not improvement", () => {
    expect(personalMoment(recent, record(4), [..."ffff"])).toBeNull();
  });

  test("not when it went wrong again", () => {
    expect(personalMoment(recent, record(4, missing("f")), typed)).toBeNull();
  });

  test("not the session after: one improvement is told once", () => {
    expect(personalMoment([...recent, record(4)], record(5), typed)).toBeNull();
  });

  test("not when it was missed in only two sessions", () => {
    expect(personalMoment(recent.slice(1), record(4), typed)).toBeNull();
  });

  test("spaces are not a key to celebrate", () => {
    const spaces = recent.map((r) =>
      Object.keys(r.errors).length ? { ...r, errors: { " ": 2 } } : r,
    );
    expect(personalMoment(spaces, record(4), [..."     "])).toBeNull();
  });

  test("the worst key wins when several were beaten", () => {
    const both = recent.map((r) =>
      Object.keys(r.errors).length ? { ...r, errors: { a: 1, f: 2 } } : r,
    );
    expect(personalMoment(both, record(4), [..."aaaaafffff"])).toEqual({
      kind: "key",
      key: "f",
    });
  });

  test("the first clean session, but not the very first session or a second one", () => {
    const perfect = { accuracy: 1 };
    expect(personalMoment([record(0)], record(1, perfect), [])).toEqual({
      kind: "clean",
    });
    expect(personalMoment([], record(1, perfect), [])).toBeNull();
    expect(
      personalMoment([record(0, perfect)], record(1, perfect), []),
    ).toBeNull();
  });
});
