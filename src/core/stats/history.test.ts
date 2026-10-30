import { expect, test } from "vitest";
import type { SessionRecord } from "../engine/record";
import { enUs } from "../layouts/en-us";
import { heatScale, keyErrors, niceMax, recentSessions } from "./history";

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

test("keyErrors sums across sessions and credits Shift for shifted characters", () => {
  const m = keyErrors(enUs, [
    rec(1, { a: 2, A: 1 }),
    rec(2, { a: 1, "\u0001": 5 }),
  ]);
  expect(m.get("KeyA")).toBe(4);
  expect(m.get("ShiftRight")).toBe(1);
  expect(m.size).toBe(2);
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
