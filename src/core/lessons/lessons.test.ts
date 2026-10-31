import { describe, expect, test } from "vitest";
import { defaultSettings } from "../settings/settings";
import type { CharStat } from "../stats/chars";
import {
  completeLesson,
  initialProgress,
  isUnlocked,
  type Lesson,
  lessonCount,
  lessonKeys,
  nextLesson,
  noNewKeys,
  type Progress,
  parseProgress,
} from "./lessons";

const letter = (stage: number) => ({ track: "letters" as const, stage });

describe("lessons", () => {
  test("only the first letter lesson starts unlocked, and tracks are closed", () => {
    const p = initialProgress();
    expect(isUnlocked("en-us", p, letter(1))).toBe(true);
    expect(isUnlocked("en-us", p, letter(2))).toBe(false);
    expect(isUnlocked("en-us", p, { track: "numbers", stage: 1 })).toBe(false);
  });

  describe("completeLesson", () => {
    const T = defaultSettings().targets;
    const good: CharStat = {
      attempts: 30,
      correct: 30,
      accuracy: 1,
      timed: 30,
      totalMs: 9000,
      ms: 300,
    };
    const meeting = (chars: string, over: Record<string, CharStat> = {}) => ({
      ...Object.fromEntries([...chars].map((c) => [c, good])),
      ...over,
    });
    const at = (o: Partial<Progress>, chars: string, stats = {}): Progress => ({
      ...initialProgress(),
      ...o,
      stats: meeting(chars, stats),
    });
    const done = (p: Progress, l: Lesson = letter(1), t = T) =>
      completeLesson("en-us", p, l, t);

    test("unlocks the next stage when every unlocked character meets the targets", () => {
      expect(done(at({}, "fj")).letters).toBe(2);
    });

    test.each([
      ["29 attempts", { ...good, attempts: 29 }],
      ["accuracy 0.94", { ...good, accuracy: 0.94 }],
      ["400 ms", { ...good, ms: 400 }],
      ["no timed samples", { ...good, timed: 0 }],
    ])("one character with %s holds the stage", (_, j) => {
      expect(done(at({}, "fj", { j })).letters).toBe(1);
    });

    test("a missing character holds the stage", () => {
      expect(done(at({}, "f")).letters).toBe(1);
    });

    test("custom targets let a weaker stat pass", () => {
      const j = { ...good, accuracy: 0.92, ms: 500 };
      const p = at({}, "fj", { j });
      expect(done(p).letters).toBe(1);
      expect(done(p, letter(1), { accuracy: 0.9, wpm: 20 }).letters).toBe(2);
    });

    test("replaying an earlier lesson checks the frontier", () => {
      expect(done(at({ letters: 3 }, "fj"), letter(1)).letters).toBe(3);
      expect(done(at({ letters: 3 }, "fjdksl"), letter(1)).letters).toBe(4);
    });

    test("a locked lesson and the last stage return the same object", () => {
      const p = at({}, "fj");
      expect(done(p, letter(5))).toBe(p);
      const last = at({ letters: 14 }, "fj");
      expect(done(last, letter(14))).toBe(last);
    });

    test("other tracks use the rule, and capitals unlock without stats", () => {
      const p = { ...initialProgress(), letters: 8 };
      const punct = { track: "punctuation" as const, stage: 1 };
      expect(done(p, punct).punctuation).toBe(2);
      const numbers = { track: "numbers" as const, stage: 1 };
      expect(done(p, numbers).numbers).toBe(1);
      expect(done(at({ letters: 8 }, "12345"), numbers).numbers).toBe(2);
    });
  });

  test("tracks open at letter step 8 and unlock stage by stage", () => {
    const p = { ...initialProgress(), letters: 8, numbers: 2 };
    const numbers = { track: "numbers" as const, stage: 1 };
    expect(isUnlocked("en-us", p, numbers)).toBe(true);
    expect(isUnlocked("en-us", p, { ...numbers, stage: 2 })).toBe(true);
    expect(isUnlocked("en-us", p, { ...numbers, stage: 3 })).toBe(false);
  });

  test("next lesson advances within the track and holds at the last stage", () => {
    expect(nextLesson("en-us", letter(3))).toEqual(letter(4));
    expect(nextLesson("en-us", letter(14))).toEqual(letter(14));
    expect(nextLesson("en-us", { track: "code", stage: 4 }).stage).toBe(4);
  });

  test("keys are what the stage adds", () => {
    expect(lessonKeys("en-us", letter(5))).toBe("e i");
    expect(lessonKeys("en-us", { track: "punctuation", stage: 2 })).toBe(". ,");
    expect(lessonKeys("en-us", { track: "punctuation", stage: 1 })).toBe("");
  });

  test("stages without new keys are named", () => {
    expect(noNewKeys({ track: "punctuation", stage: 1 })).toBe("capitals");
    expect(noNewKeys({ track: "code", stage: 4 })).toBe("snippets");
    expect(noNewKeys(letter(5))).toBeUndefined();
  });
});

describe("parseProgress", () => {
  test.each([undefined, null, 3, "x"])("falls back for %j", (v) => {
    expect(parseProgress("en-us", v)).toEqual(initialProgress());
  });

  test("keeps valid tracks, resets bad ones, clamps to the stage count", () => {
    const got = parseProgress("en-us", {
      letters: 5,
      punctuation: "2",
      numbers: 0,
      code: 999,
      extra: 1,
    });
    expect(got.letters).toBe(5);
    expect(got.punctuation).toBe(1);
    expect(got.numbers).toBe(1);
    expect(got.code).toBe(lessonCount("en-us", "code"));
    expect(Object.keys(got).sort()).toEqual(
      Object.keys(initialProgress()).sort(),
    );
  });

  test("keeps a saved lesson only while it is unlocked", () => {
    const saved = (lesson: unknown, letters = 5) =>
      parseProgress("en-us", { letters, lesson }).lesson;
    expect(saved({ track: "letters", stage: 4 })).toEqual({
      track: "letters",
      stage: 4,
    });
    const first = { track: "letters", stage: 1 };
    expect(saved({ track: "letters", stage: 6 })).toEqual(first);
    expect(saved({ track: "letters", stage: 0 })).toEqual(first);
    expect(saved({ track: "letters", stage: 1.5 })).toEqual(first);
    expect(saved({ track: "code", stage: 1 })).toEqual(first);
    expect(saved({ track: "nope", stage: 1 })).toEqual(first);
    expect(saved("x")).toEqual(first);
    expect(saved({ track: "numbers", stage: 1 }, 30)).toEqual({
      track: "numbers",
      stage: 1,
    });
  });

  test("reads missing stats as empty and keeps valid ones", () => {
    expect(parseProgress("en-us", { letters: 2 }).stats).toEqual({});
    const stat = {
      attempts: 1,
      correct: 1,
      accuracy: 1,
      timed: 0,
      ms: 0,
      totalMs: 0,
    };
    expect(
      parseProgress("en-us", { stats: { a: stat, ab: stat } }).stats,
    ).toEqual({ a: stat });
  });
});
