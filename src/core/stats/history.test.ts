import { describe, expect, test } from "vitest";
import type { SessionRecord } from "../engine/record";
import {
  heatScale,
  niceMax,
  overview,
  recentSessions,
  speedChange,
} from "./history";

const rec = (
  at: number,
  errors: Record<string, number>,
  layout: SessionRecord["layout"] = "en-us",
): SessionRecord => ({
  at,
  layout,
  mode: "stop",
  lesson: { track: "letters", stage: 1 },
  wpm: 30,
  accuracy: 0.9,
  durationMs: 1000,
  errors,
});

test("recentSessions keeps the newest of one layout, oldest first", () => {
  const r = [rec(3, {}), rec(1, {}), rec(2, {}), rec(4, {}, "cs-qwertz")];
  expect(recentSessions(r, "en-us", 2).map((x) => x.at)).toEqual([2, 3]);
});

test("heatScale is relative to the worst key", () => {
  const h = heatScale(
    new Map([
      ["KeyA", 4],
      ["KeyB", 1],
      ["KeyC", 0],
    ]),
  );
  expect([...h]).toEqual([
    ["KeyA", 1],
    ["KeyB", 0.25],
  ]);
  expect(heatScale(new Map()).size).toBe(0);
});

test("niceMax rounds up to 1, 2 or 5 times a power of ten", () => {
  expect([
    niceMax(0),
    niceMax(1),
    niceMax(37),
    niceMax(101),
    niceMax(0.3),
  ]).toEqual([1, 1, 50, 200, 0.5]);
});

describe("overview", () => {
  const session = (at: number, wpm: number, accuracy: number) => ({
    ...rec(at, {}),
    wpm,
    accuracy,
  });

  test("has only the total time with no session on the layout", () => {
    expect(overview([rec(1, {}, "cs-qwertz")], "en-us")).toEqual({
      totalMs: 1000,
    });
  });

  test("averages the sessions there are, with no change yet", () => {
    const o = overview([session(1, 20, 0.8), session(2, 40, 1)], "en-us");
    expect(o.recent).toEqual({ sessions: 2, wpm: 30, accuracy: 0.9 });
  });

  test("shows no change one session short of two full windows", () => {
    const records = Array.from({ length: 19 }, (_, i) => session(i, 30, 0.9));
    expect(overview(records, "en-us").recent?.change).toBeUndefined();
  });

  test("compares the newest ten with the ten before", () => {
    const records = Array.from({ length: 25 }, (_, i) =>
      session(i, i < 15 ? 30 : 40, i < 15 ? 0.9 : 0.95),
    );
    const o = overview(records, "en-us");
    expect(o.recent?.sessions).toBe(10);
    expect(o.recent?.wpm).toBe(40);
    expect(o.recent?.change?.wpm).toBe(10);
    expect(o.recent?.change?.accuracy).toBeCloseTo(0.05);
  });

  test("counts time on every layout but speed only on this one", () => {
    const o = overview(
      [session(1, 20, 0.9), { ...session(2, 90, 1), layout: "cs-qwertz" }],
      "en-us",
    );
    expect(o.totalMs).toBe(2000);
    expect(o.recent?.wpm).toBe(20);
  });
});

describe("speedChange", () => {
  const session = (
    at: number,
    wpm: number,
    layout: SessionRecord["layout"] = "en-us",
  ) => ({
    ...rec(at, {}, layout),
    wpm,
  });
  const earlier = (n: number, wpm = 30) =>
    Array.from({ length: n }, (_, i) => session(i + 1, wpm));

  test("needs five earlier sessions", () => {
    const now = session(100, 40);
    expect(speedChange(earlier(4), now)).toBeUndefined();
    expect(speedChange(earlier(5), now)).toBe(10);
  });

  test("leaves this session out, saved or not", () => {
    const now = session(100, 40);
    expect(speedChange([...earlier(5), now], now)).toBe(10);
    expect(speedChange([...earlier(4), now], now)).toBeUndefined();
  });

  test("uses only the last ten", () => {
    const old = Array.from({ length: 10 }, (_, i) => session(i + 1, 90));
    const recent = Array.from({ length: 10 }, (_, i) => session(i + 11, 30));
    expect(speedChange([...old, ...recent], session(100, 40))).toBe(10);
  });

  test("ignores other layouts", () => {
    const others = Array.from({ length: 5 }, (_, i) =>
      session(i + 1, 30, "cs-qwertz"),
    );
    expect(speedChange(others, session(100, 40))).toBeUndefined();
  });
});
