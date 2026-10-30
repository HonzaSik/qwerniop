import { describe, expect, test } from "vitest";
import {
  completeLesson,
  initialProgress,
  isUnlocked,
  lessonKeys,
  lessonTitle,
  nextLesson,
} from "./lessons";

const letter = (stage: number) => ({ track: "letters" as const, stage });

describe("lessons", () => {
  test("only the first letter lesson starts unlocked, and tracks are closed", () => {
    const p = initialProgress();
    expect(isUnlocked("en-us", p, letter(1))).toBe(true);
    expect(isUnlocked("en-us", p, letter(2))).toBe(false);
    expect(isUnlocked("en-us", p, { track: "numbers", stage: 1 })).toBe(false);
  });

  test("completing a lesson unlocks the next, never lowers, and stops at the end", () => {
    let p = completeLesson("en-us", initialProgress(), letter(1));
    expect(p.letters).toBe(2);
    p = completeLesson("en-us", p, letter(1));
    expect(p.letters).toBe(2);
    p = { ...p, letters: 14 };
    expect(completeLesson("en-us", p, letter(14)).letters).toBe(14);
  });

  test("a locked lesson cannot be completed", () => {
    const p = initialProgress();
    expect(completeLesson("en-us", p, letter(5))).toBe(p);
  });

  test("tracks open at letter step 8 and unlock stage by stage", () => {
    let p = { ...initialProgress(), letters: 8 };
    const numbers = { track: "numbers" as const, stage: 1 };
    expect(isUnlocked("en-us", p, numbers)).toBe(true);
    expect(isUnlocked("en-us", p, { ...numbers, stage: 2 })).toBe(false);
    p = completeLesson("en-us", p, numbers);
    expect(isUnlocked("en-us", p, { ...numbers, stage: 2 })).toBe(true);
  });

  test("layouts without an order have no lessons", () => {
    expect(isUnlocked("cs-qwertz", initialProgress(), letter(1))).toBe(false);
  });

  test("next lesson advances within the track and holds at the last stage", () => {
    expect(nextLesson("en-us", letter(3))).toEqual(letter(4));
    expect(nextLesson("en-us", letter(14))).toEqual(letter(14));
    expect(nextLesson("en-us", { track: "code", stage: 4 }).stage).toBe(4);
  });

  test("keys are what the stage adds", () => {
    expect(lessonKeys("en-us", letter(5))).toBe("e i");
    expect(lessonKeys("en-us", { track: "punctuation", stage: 2 })).toBe(". ,");
    expect(lessonKeys("en-us", { track: "punctuation", stage: 1 })).toBe(
      "capitals",
    );
  });

  test("titles use the display names", () => {
    expect(lessonTitle("en-us", letter(5))).toBe("Lesson 5 · e i");
    expect(lessonTitle("en-us", { track: "numbers", stage: 2 })).toBe(
      "Numbers 2 · 6 7 8 9 0",
    );
    expect(lessonTitle("en-us", { track: "punctuation", stage: 1 })).toBe(
      "Punctuation 1 · capitals",
    );
  });
});
