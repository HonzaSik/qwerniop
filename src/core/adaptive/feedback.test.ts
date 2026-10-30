import { describe, expect, test } from "vitest";
import { enUs } from "../layouts/en-us";
import type { CharStat } from "../stats/chars";
import { feedbackSentence, weakestKeys } from "./feedback";
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

describe("feedbackSentence", () => {
  const base = { wpm: 50, accuracy: 1, targets: T, weakest: [] as string[] };
  test.each([
    [
      "unlocked beats low accuracy",
      { ...base, accuracy: 0.5, unlocked: "Lesson 6 · r u" },
      "Lesson 6 · r u is unlocked.",
    ],
    [
      "low accuracy with keys",
      { ...base, accuracy: 0.9, weakest: ["F", "J"] },
      "Slow down and aim for accuracy, especially on F and J.",
    ],
    [
      "low accuracy without keys",
      { ...base, accuracy: 0.9 },
      "Slow down and aim for accuracy.",
    ],
    [
      "accuracy exactly at target",
      { ...base, accuracy: 0.95, wpm: 10 },
      "Accuracy is on target. Keep a steady rhythm to build speed.",
    ],
    [
      "slow with keys",
      { ...base, wpm: 20, weakest: ["F"] },
      "Accuracy is on target. Keep a steady rhythm to build speed on F.",
    ],
    ["speed exactly at target", base, "Both targets met."],
    [
      "met, one key",
      { ...base, weakest: ["F"] },
      "Both targets met. F still needs practice.",
    ],
    [
      "met, two keys",
      { ...base, weakest: ["F", "J"] },
      "Both targets met. F and J still need practice.",
    ],
    [
      "met, three keys",
      { ...base, weakest: ["F", "J", "K"] },
      "Both targets met. F, J and K still need practice.",
    ],
  ])("%s", (_, input, expected) => {
    expect(feedbackSentence(input)).toBe(expected);
  });

  test("wpm exactly at target counts as met", () => {
    expect(feedbackSentence({ ...base, wpm: 35 })).toBe("Both targets met.");
  });
});
