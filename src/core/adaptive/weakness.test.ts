import { describe, expect, test } from "vitest";
import type { CharStat } from "../stats/chars";
import { type Targets, weakness } from "./weakness";

const T: Targets = { accuracy: 0.95, wpm: 35 };
const stat = (o: Partial<CharStat> = {}): CharStat => ({
  attempts: 30,
  correct: 30,
  accuracy: 1,
  timed: 30,
  totalMs: 9000,
  ms: 300,
  ...o,
});

describe("weakness", () => {
  test("unseen is fully weak", () => {
    expect(weakness(undefined, T)).toBe(1);
  });

  test("at both targets is zero", () => {
    expect(weakness(stat(), T)).toBe(0);
  });

  test("accuracy and speed gaps each count half", () => {
    expect(weakness(stat({ accuracy: 0.9 }), T)).toBeCloseTo(0.25);
    expect(weakness(stat({ ms: 60000 / 35 / 5 / 0.5 }), T)).toBeCloseTo(0.25);
  });

  test("looser targets accept a weaker stat", () => {
    const weak = stat({ accuracy: 0.92, ms: 500 });
    expect(weakness(weak, T)).toBeGreaterThan(0);
    expect(weakness(weak, { accuracy: 0.9, wpm: 20 })).toBe(0);
  });

  test("few attempts blend toward 1", () => {
    expect(weakness(stat({ attempts: 15 }), T)).toBeCloseTo(0.5);
  });

  test("no timed samples counts as the worst speed", () => {
    expect(weakness(stat({ timed: 0 }), T)).toBeCloseTo(0.5);
  });

  test("grows as accuracy drops and as time rises", () => {
    const acc = [1, 0.95, 0.9, 0.8, 0.5].map((accuracy) =>
      weakness(stat({ accuracy }), T),
    );
    const ms = [200, 343, 500, 900, 3000].map((m) =>
      weakness(stat({ ms: m }), T),
    );
    for (const xs of [acc, ms]) {
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i] ?? 0).toBeGreaterThanOrEqual(xs[i - 1] ?? 1);
      }
    }
  });
});
