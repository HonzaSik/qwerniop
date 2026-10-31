import { describe, expect, test } from "vitest";
import { enUs } from "../layouts/en-us";
import type { CharStat } from "../stats/chars";
import { feedbackRule, weakestKeys } from "./feedback";
import type { Targets } from "./weakness";

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
const ok = stat();
const weak = (accuracy: number) => stat({ accuracy });

describe("weakestKeys", () => {
  test.each([
    [
      "ranks by weakness, weakest first",
      ["a", "b", "c"],
      { a: weak(0.9), b: weak(0.5), c: weak(0.8) },
      3,
      ["KeyB", "KeyC", "KeyA"],
    ],
    [
      "drops characters at target",
      ["a", "b"],
      { a: ok, b: weak(0.5) },
      3,
      ["KeyB"],
    ],
    [
      "drops space and newline",
      [" ", "\n", "a"],
      { " ": weak(0.5), "\n": weak(0.5), a: weak(0.5) },
      3,
      ["KeyA"],
    ],
    [
      "dedupes characters",
      ["a", "a", "b"],
      { a: weak(0.5), b: weak(0.5) },
      3,
      ["KeyA", "KeyB"],
    ],
    [
      "ties keep first-seen order",
      ["c", "a", "b"],
      { a: weak(0.5), b: weak(0.5), c: weak(0.5) },
      3,
      ["KeyC", "KeyA", "KeyB"],
    ],
    [
      "caps at n",
      ["a", "b", "c"],
      { a: weak(0.5), b: weak(0.5), c: weak(0.5) },
      2,
      ["KeyA", "KeyB"],
    ],
    ["empty input", [], {}, 3, []],
    [
      "unseen character is fully weak",
      ["a", "b"],
      { a: weak(0.9) },
      3,
      ["KeyB", "KeyA"],
    ],
    [
      "a and A are one key",
      ["a", "A", "b"],
      { a: weak(0.5), A: weak(0.5), b: weak(0.3) },
      3,
      ["KeyB", "KeyA"],
    ],
    [
      "skips characters off the layout",
      ["ř", "a"],
      { ř: weak(0.5), a: weak(0.5) },
      3,
      ["KeyA"],
    ],
  ])("%s", (_, chars, stats, n, expected) => {
    expect(weakestKeys(enUs, stats, chars, T, n)).toEqual(expected);
  });
});

describe("feedbackRule", () => {
  const base = { wpm: 50, accuracy: 1, targets: T, weakest: [] as string[] };
  test.each([
    [
      "unlocked beats low accuracy",
      { ...base, accuracy: 0.5, unlocked: "Lesson 6" },
      { rule: "unlocked", title: "Lesson 6" },
    ],
    [
      "low accuracy",
      { ...base, accuracy: 0.9, weakest: ["F", "J"] },
      { rule: "accuracy", keys: ["F", "J"] },
    ],
    [
      "accuracy exactly at target",
      { ...base, accuracy: 0.95, wpm: 10 },
      { rule: "speed", keys: [] },
    ],
    [
      "slow with keys",
      { ...base, wpm: 20, weakest: ["F"] },
      { rule: "speed", keys: ["F"] },
    ],
    ["speed exactly at target", base, { rule: "met", keys: [] }],
    [
      "met with keys",
      { ...base, weakest: ["F", "J"] },
      { rule: "met", keys: ["F", "J"] },
    ],
  ])("%s", (_, input, expected) => {
    expect(feedbackRule(input)).toEqual(expected);
  });
});
