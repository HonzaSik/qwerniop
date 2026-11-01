import { describe, expect, test } from "vitest";
import type { SessionRecord } from "../engine/record";
import { calendarDays, dayKey, practiceByDay, practiceLevel } from "./practice";

const at = (y: number, m: number, d: number, h = 12, min = 0): number =>
  new Date(y, m - 1, d, h, min).getTime();

const record = (when: number, durationMs: number): SessionRecord => ({
  at: when,
  layout: "en-us",
  mode: "stop",
  lesson: { track: "letters", stage: 1 },
  wpm: 30,
  accuracy: 0.95,
  durationMs,
  errors: {},
});

describe("dayKey", () => {
  test("uses the local calendar day, padded", () => {
    expect(dayKey(at(2026, 3, 7))).toBe("2026-03-07");
  });

  test("splits at local midnight", () => {
    expect(dayKey(at(2026, 11, 1, 23, 59))).toBe("2026-11-01");
    expect(dayKey(at(2026, 11, 2, 0, 0))).toBe("2026-11-02");
  });
});

describe("practiceByDay", () => {
  test("sums durations per day across layouts", () => {
    const other = {
      ...record(at(2026, 11, 2, 9), 60_000),
      layout: "cs-qwertz" as const,
    };
    const days = practiceByDay([
      record(at(2026, 11, 2, 8), 120_000),
      other,
      record(at(2026, 11, 1, 22), 30_000),
    ]);
    expect(days.get("2026-11-02")).toBe(180_000);
    expect(days.get("2026-11-01")).toBe(30_000);
    expect(days.size).toBe(2);
  });

  test("is empty for no records", () => {
    expect(practiceByDay([]).size).toBe(0);
  });
});

describe("calendarDays", () => {
  // 2026-11-02 is a Monday.
  const monday = at(2026, 11, 2);

  test("weeks starting Monday end with a partial current week", () => {
    const weeks = calendarDays(monday, 2, 1);
    expect(weeks).toEqual([
      [
        "2026-10-26",
        "2026-10-27",
        "2026-10-28",
        "2026-10-29",
        "2026-10-30",
        "2026-10-31",
        "2026-11-01",
      ],
      ["2026-11-02"],
    ]);
  });

  test("one week is the current partial week", () => {
    expect(calendarDays(at(2026, 11, 4), 1, 1)).toEqual([
      ["2026-11-02", "2026-11-03", "2026-11-04"],
    ]);
  });

  test("today at local midnight still ends on today", () => {
    expect(
      calendarDays(at(2026, 11, 4, 0, 0), 1, 1)
        .at(-1)
        ?.at(-1),
    ).toBe("2026-11-04");
  });

  test("weeks starting Sunday put Sunday first", () => {
    const weeks = calendarDays(monday, 2, 0);
    expect(weeks[0]?.[0]).toBe("2026-10-25");
    expect(weeks[1]).toEqual(["2026-11-01", "2026-11-02"]);
  });

  test("a full year has 53 columns and every column but the last has 7 days", () => {
    const weeks = calendarDays(monday, 53, 1);
    expect(weeks).toHaveLength(53);
    expect(weeks.slice(0, -1).every((w) => w.length === 7)).toBe(true);
    expect(weeks.at(-1)?.at(-1)).toBe("2026-11-02");
  });

  test("days stay distinct across a daylight saving change", () => {
    const days = calendarDays(at(2026, 4, 5), 3, 1).flat();
    expect(new Set(days).size).toBe(days.length);
    expect(days).toContain("2026-03-29");
  });
});

describe("practiceLevel", () => {
  const min = 60_000;
  test.each([
    [0, 0],
    [1, 1],
    [5 * min - 1, 1],
    [5 * min, 2],
    [15 * min - 1, 2],
    [15 * min, 3],
    [30 * min - 1, 3],
    [30 * min, 4],
    [120 * min, 4],
  ])("%d ms is level %d", (ms, level) => {
    expect(practiceLevel(ms)).toBe(level);
  });
});
