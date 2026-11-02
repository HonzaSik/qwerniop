import { describe, expect, test } from "vitest";
import { enUs } from "../layouts/en-us";
import type { CharStat } from "../stats/chars";
import { keyMissRates, missRates } from "./mistakes";

const targets = { accuracy: 0.95, wpm: 35 };

const stat = (accuracy: number, attempts = 30): CharStat => ({
  attempts,
  correct: Math.round(attempts * accuracy),
  accuracy,
  timed: attempts,
  totalMs: attempts * 200,
  ms: 200,
});

describe("missRates", () => {
  test("lists the most missed characters first, with their rate", () => {
    const out = missRates({ f: stat(0.9), j: stat(0.7) }, targets, 5);
    expect(out.map((m) => m.char)).toEqual(["j", "f"]);
    expect(out[0]?.rate).toBeCloseTo(0.3);
    expect(out[1]?.rate).toBeCloseTo(0.1);
  });

  test("leaves out characters at or better than the target", () => {
    expect(
      missRates({ f: stat(0.95), j: stat(1), k: stat(0.94) }, targets, 5).map(
        (m) => m.char,
      ),
    ).toEqual(["k"]);
  });

  test("follows the configured target", () => {
    const stats = { f: stat(0.92) };
    expect(missRates(stats, { ...targets, accuracy: 0.9 }, 5)).toEqual([]);
    expect(missRates(stats, { ...targets, accuracy: 0.98 }, 5)).toHaveLength(1);
  });

  test("needs ten attempts before a character counts", () => {
    expect(missRates({ f: stat(0, 9) }, targets, 5)).toEqual([]);
    expect(missRates({ f: stat(0, 10) }, targets, 5)).toHaveLength(1);
  });

  test("leaves out Space", () => {
    expect(missRates({ " ": stat(0.5) }, targets, 5)).toEqual([]);
  });

  test("keeps only the n worst", () => {
    const stats = { a: stat(0.9), b: stat(0.8), c: stat(0.7) };
    expect(missRates(stats, targets, 2).map((m) => m.char)).toEqual(["c", "b"]);
  });

  test("is empty without stats", () => {
    expect(missRates({}, targets, 5)).toEqual([]);
  });
});

describe("keyMissRates", () => {
  const tried = (attempts: number, correct: number): CharStat => ({
    ...stat(1, attempts),
    correct,
  });

  test("is the share of tries that went wrong, not the count", () => {
    const rates = keyMissRates(enUs, { k: tried(100, 90), z: tried(10, 5) });
    expect(rates.get("KeyK")).toBeCloseTo(0.1);
    expect(rates.get("KeyZ")).toBeCloseTo(0.5);
  });

  test("adds a letter's capital to its key and counts Shift", () => {
    const rates = keyMissRates(enUs, { a: tried(30, 30), A: tried(10, 5) });
    expect(rates.get("KeyA")).toBeCloseTo(5 / 40);
    // The opposite hand's Shift, and only the capital's tries count for it.
    expect(rates.get("ShiftRight")).toBeCloseTo(0.5);
  });

  test("counts Space", () => {
    expect(keyMissRates(enUs, { " ": tried(40, 30) }).get("Space")).toBeCloseTo(
      0.25,
    );
  });

  test("leaves out keys never missed and keys with under ten tries", () => {
    const rates = keyMissRates(enUs, { f: tried(50, 50), j: tried(9, 0) });
    expect(rates.size).toBe(0);
  });
});
