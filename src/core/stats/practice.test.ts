import { describe, expect, test } from "vitest";
import type { SessionRecord } from "../engine/record";
import {
  dayKey,
  monthGrid,
  practiceByDay,
  practiceLevel,
  practiceStreak,
  recentSpread,
} from "./practice";

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
    expect(days.get("2026-11-02")).toEqual({ ms: 180_000, sessions: 2 });
    expect(days.get("2026-11-01")).toEqual({ ms: 30_000, sessions: 1 });
    expect(days.size).toBe(2);
  });

  test("is empty for no records", () => {
    expect(practiceByDay([]).size).toBe(0);
  });
});

describe("monthGrid", () => {
  // 1 November 2026 is a Sunday.
  test("Monday weeks pad the first row before the 1st", () => {
    const rows = monthGrid(2026, 10, 1);
    expect(rows[0]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "2026-11-01",
    ]);
    expect(rows.at(-1)?.[0]).toBe("2026-11-30");
    expect(rows).toHaveLength(6);
  });

  test("Sunday weeks start on the 1st", () => {
    const rows = monthGrid(2026, 10, 0);
    expect(rows[0]?.[0]).toBe("2026-11-01");
    expect(rows).toHaveLength(5);
  });

  test("every row has seven cells and every day appears once", () => {
    for (const month of [0, 1, 2, 9, 11]) {
      const rows = monthGrid(2026, month, 1);
      expect(rows.every((r) => r.length === 7)).toBe(true);
      const days = rows.flat().filter((d) => d !== undefined);
      expect(new Set(days).size).toBe(days.length);
      expect(days[0]?.endsWith("-01")).toBe(true);
    }
  });

  test("February 2026 with Sunday weeks is exactly four rows", () => {
    const rows = monthGrid(2026, 1, 0);
    expect(rows).toHaveLength(4);
    expect(rows.flat().at(-1)).toBe("2026-02-28");
  });

  test("a leap February has 29 days", () => {
    expect(monthGrid(2028, 1, 1).flat()).toContain("2028-02-29");
  });

  test("days stay distinct across a daylight saving change", () => {
    const days = monthGrid(2026, 2, 1).flat().filter(Boolean);
    expect(days).toHaveLength(31);
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

describe("recentSpread", () => {
  const today = new Date(2026, 10, 15, 12).getTime();
  const days = new Map([
    ["2026-11-15", { ms: 600_000, sessions: 1 }],
    ["2026-11-09", { ms: 1_200_000, sessions: 2 }],
    ["2026-11-08", { ms: 9_000_000, sessions: 9 }],
  ]);

  test("counts the last seven days including today and averages over days practised", () => {
    expect(recentSpread(days, today)).toEqual({ days: 2, minutes: 15 });
  });

  test("a short practice never reads as zero minutes", () => {
    const short = new Map([["2026-11-15", { ms: 5_000, sessions: 1 }]]);
    expect(recentSpread(short, today)).toEqual({ days: 1, minutes: 1 });
  });

  test("no practice in the window", () => {
    expect(recentSpread(new Map(), today)).toEqual({ days: 0, minutes: 0 });
  });
});

describe("practiceStreak", () => {
  const seen = (...dates: [number, number, number][]) =>
    new Map(
      dates.map(([y, m, d]) => [dayKey(at(y, m, d)), { ms: 1, sessions: 1 }]),
    );

  test("is zero with no practice", () => {
    expect(practiceStreak(new Map(), at(2026, 3, 10))).toEqual({
      current: 0,
      best: 0,
    });
  });

  test("counts days in a row up to today", () => {
    const days = seen([2026, 3, 8], [2026, 3, 9], [2026, 3, 10]);
    expect(practiceStreak(days, at(2026, 3, 10)).current).toBe(3);
  });

  test("stays alive until today ends", () => {
    const days = seen([2026, 3, 8], [2026, 3, 9]);
    expect(practiceStreak(days, at(2026, 3, 10, 23, 59)).current).toBe(2);
  });

  test("a missed day ends it but keeps the best", () => {
    const days = seen([2026, 3, 1], [2026, 3, 2], [2026, 3, 3], [2026, 3, 8]);
    expect(practiceStreak(days, at(2026, 3, 8))).toEqual({
      current: 1,
      best: 3,
    });
    expect(practiceStreak(days, at(2026, 3, 10)).current).toBe(0);
  });

  test("runs across a month end", () => {
    const days = seen([2026, 1, 31], [2026, 2, 1]);
    expect(practiceStreak(days, at(2026, 2, 1)).current).toBe(2);
  });

  test("runs across a clock change", () => {
    const days = seen([2026, 3, 28], [2026, 3, 29], [2026, 3, 30]);
    expect(practiceStreak(days, at(2026, 3, 30)).current).toBe(3);
  });
});
