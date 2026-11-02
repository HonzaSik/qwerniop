import { expect, test } from "vitest";
import type { SessionRecord } from "../engine/record";
import { dailyResult, dailySummary } from "./daily";

const rec = (
  at: number,
  wpm: number,
  daily?: string,
  layout: SessionRecord["layout"] = "en-us",
): SessionRecord => ({
  at,
  layout,
  mode: "stop",
  lesson: { track: "custom", stage: 0 },
  wpm,
  accuracy: 0.9,
  durationMs: 1000,
  errors: {},
  ...(daily === undefined ? {} : { daily }),
});

const TODAY = "2026-11-02";

test("with no try there is no score", () => {
  expect(dailySummary([rec(1, 50)], "en-us", TODAY)).toEqual({ days: 0 });
});

test("the first finished try scores, and a faster later one does not", () => {
  const s = dailySummary(
    [rec(2, 90, TODAY), rec(1, 60, TODAY), rec(3, 99, TODAY)],
    "en-us",
    TODAY,
  );
  expect(s.today).toEqual({ at: 1, wpm: 60, accuracy: 0.9 });
  expect(s.days).toBe(1);
  expect(s.best?.wpm).toBe(60);
});

test("best and days cover scored tries of every date", () => {
  const s = dailySummary(
    [rec(1, 70, "2026-11-01"), rec(2, 95, "2026-11-01"), rec(3, 40, TODAY)],
    "en-us",
    TODAY,
  );
  expect(s.days).toBe(2);
  expect(s.best).toEqual({ wpm: 70, date: "2026-11-01" });
  expect(s.today?.wpm).toBe(40);
});

test("another layout is another challenge", () => {
  const s = dailySummary([rec(1, 60, TODAY, "cs-qwertz")], "en-us", TODAY);
  expect(s).toEqual({ days: 0 });
});

test("a result says whether this try was the scored one", () => {
  const first = rec(1, 60, TODAY);
  const again = rec(2, 80, TODAY);
  expect(dailyResult([first], first, TODAY)?.first).toBe(true);
  const r = dailyResult([first, again], again, TODAY);
  expect(r?.first).toBe(false);
  expect(r?.score.wpm).toBe(60);
});
