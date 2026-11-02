import { describe, expect, test } from "vitest";
import { type PetState, petMoment, petState } from "./pet";
import { type DayPractice, dayKey } from "./practice";

const MINUTE = 60_000;
const at = (y: number, m: number, d: number): number =>
  new Date(y, m - 1, d, 12).getTime();
const day = (minutes: number): DayPractice => ({
  ms: minutes * MINUTE,
  sessions: 1,
});
const history = (...entries: [number, number][]): Map<string, DayPractice> =>
  new Map(
    entries.map(([date, minutes]) => [dayKey(at(2026, 3, date)), day(minutes)]),
  );
/** Spread over days, one hour each, so the daily cap does not get in the way. */
const practised = (minutes: number): Map<string, DayPractice> => {
  const out = new Map<string, DayPractice>();
  for (let i = 0; minutes > 0; i++) {
    out.set(
      dayKey(new Date(2026, 0, 1 + i, 12).getTime()),
      day(Math.min(minutes, 60)),
    );
    minutes -= 60;
  }
  return out;
};
const dayAfter = (days: Map<string, DayPractice>): number => {
  const last = [...days.keys()].sort().at(-1) ?? "";
  return new Date(`${last}T12:00:00`).getTime() + 86_400_000;
};

describe("petMoment", () => {
  const pet = (over: Partial<PetState>): PetState => ({
    stage: "egg",
    mood: "content",
    level: 1,
    progress: 0,
    minutes: 0,
    toNext: 5,
    ageDays: 0,
    togetherDays: 0,
    daysAway: 0,
    lastPractised: "2026-03-01",
    lost: 0,
    ...over,
  });

  test("the first session has no moment", () => {
    expect(petMoment(null, pet({}))).toBeNull();
  });

  test("nothing new is no moment", () => {
    expect(petMoment(pet({}), pet({}))).toBeNull();
  });

  test("a new level", () => {
    expect(petMoment(pet({}), pet({ level: 2 }))).toEqual({
      kind: "level",
      level: 2,
    });
  });

  test("a new stage says more than its level", () => {
    expect(
      petMoment(pet({ level: 2 }), pet({ level: 3, stage: "hatchling" })),
    ).toEqual({ kind: "stage", stage: "hatchling" });
  });

  test("coming back to a hungry pet says more than a level", () => {
    expect(
      petMoment(pet({ mood: "hungry", daysAway: 6 }), pet({ level: 2 })),
    ).toEqual({ kind: "missed", days: 6 });
  });

  test("coming back to a dead pet says the most", () => {
    expect(petMoment(pet({ mood: "dead", level: 9 }), pet({}))).toEqual({
      kind: "reborn",
    });
  });
});

describe("petState", () => {
  test("no practice means no pet", () => {
    expect(petState(new Map(), at(2026, 3, 1))).toBeNull();
  });

  test.each([
    [14, "egg", 2],
    [15, "hatchling", 3],
    [59, "hatchling", 4],
    [60, "seedling", 5],
    [179, "seedling", 6],
    [180, "sprout", 7],
    [479, "sprout", 9],
    [480, "sapling", 10],
    [1079, "sapling", 12],
    [1080, "bush", 13],
    [2099, "bush", 16],
    [2100, "bloom", 17],
    [5999, "bloom", 19],
    [6000, "guardian", 20],
  ])("%i minutes make a %s at level %i", (minutes, stage, level) => {
    const days = practised(minutes);
    expect(petState(days, dayAfter(days))).toMatchObject({
      stage,
      level,
      minutes,
    });
  });

  test("gives minutes to the next level and the share of this one", () => {
    const days = practised(45);
    expect(petState(days, dayAfter(days))).toMatchObject({
      level: 4,
      toNext: 15,
      progress: 0.5,
    });
  });

  test("the top level has no next level", () => {
    const days = practised(6000);
    expect(petState(days, dayAfter(days))).toMatchObject({
      stage: "guardian",
      level: 20,
      toNext: undefined,
      progress: 1,
    });
  });

  test("a day counts for at most 60 minutes", () => {
    const got = petState(history([1, 300], [2, 30]), at(2026, 3, 2));
    expect(got?.minutes).toBe(90);
  });

  test.each([
    [3, "content"],
    [4, "hungry"],
    [13, "hungry"],
    [14, "dead"],
    [40, "dead"],
  ])("%i days away is %s", (daysAway, mood) => {
    expect(petState(history([1, 30]), at(2026, 3, 1 + daysAway))).toMatchObject(
      { mood, daysAway },
    );
  });

  test("a hungry pet recovers with one session and loses no growth", () => {
    const got = petState(history([1, 60], [11, 5]), at(2026, 3, 11));
    expect(got).toMatchObject({ mood: "content", minutes: 65, lost: 0 });
  });

  test("a dead pet counts as lost and has no next stage", () => {
    expect(petState(history([1, 60]), at(2026, 3, 15))).toMatchObject({
      mood: "dead",
      stage: "seedling",
      toNext: undefined,
      lost: 1,
    });
  });

  test("a dead pet's age stops at its last practice", () => {
    const got = petState(history([1, 60], [3, 60]), at(2026, 3, 25));
    expect(got).toMatchObject({ mood: "dead", ageDays: 2 });
  });

  test("practice after a death starts a new egg", () => {
    const got = petState(history([1, 60], [15, 5]), at(2026, 3, 15));
    expect(got).toMatchObject({
      stage: "egg",
      mood: "content",
      minutes: 5,
      ageDays: 0,
      lost: 1,
      lastPractised: dayKey(at(2026, 3, 15)),
    });
  });

  test("every death counts, across a change of year", () => {
    const days = new Map([
      [dayKey(at(2025, 11, 1)), day(5)],
      [dayKey(at(2025, 12, 20)), day(5)],
      [dayKey(at(2026, 1, 2)), day(5)],
      [dayKey(at(2026, 2, 1)), day(5)],
    ]);
    expect(petState(days, at(2026, 2, 1))).toMatchObject({
      lost: 2,
      minutes: 5,
    });
    // 20 December to 2 January is 13 days, so that pet lived on.
    days.delete(dayKey(at(2026, 2, 1)));
    expect(petState(days, at(2026, 1, 2))).toMatchObject({
      lost: 1,
      minutes: 10,
    });
  });

  test("time together keeps counting through a death", () => {
    const got = petState(history([1, 60], [15, 5]), at(2026, 3, 20));
    expect(got).toMatchObject({ ageDays: 5, togetherDays: 19 });
  });

  test("a gap of 13 days does not kill it", () => {
    const got = petState(history([1, 60], [14, 5]), at(2026, 3, 14));
    expect(got).toMatchObject({ minutes: 65, ageDays: 13, lost: 0 });
  });

  test("age counts from the current pet's first day", () => {
    const got = petState(history([1, 5], [20, 5], [22, 5]), at(2026, 3, 25));
    expect(got?.ageDays).toBe(5);
  });

  test("a daylight saving change does not move a day boundary", () => {
    // Clocks change on 29 March 2026 in Central Europe and on 8 March in the US.
    const days = new Map([[dayKey(at(2026, 3, 1)), day(5)]]);
    expect(petState(days, new Date(2026, 2, 15, 0, 30).getTime())?.mood).toBe(
      "dead",
    );
    expect(petState(days, new Date(2026, 2, 14, 23, 30).getTime())?.mood).toBe(
      "hungry",
    );
  });

  test("a clock set back reads as no time away", () => {
    const got = petState(history([20, 5]), at(2026, 3, 1));
    expect(got).toMatchObject({ daysAway: 0, ageDays: 0, mood: "content" });
  });
});
