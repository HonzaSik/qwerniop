import { describe, expect, test } from "vitest";
import { cs, plural } from "./cs";
import { en } from "./en";
import { feedbackText, lessonTitle, pickStrings } from "./index";

describe("pickStrings", () => {
  test("Czech browsers get Czech, the rest English", () => {
    expect(pickStrings("cs")).toBe(cs);
    expect(pickStrings("cs-CZ")).toBe(cs);
    expect(pickStrings("en-US")).toBe(en);
    expect(pickStrings("de")).toBe(en);
  });
});

describe("plural", () => {
  test.each([
    [0, "many"],
    [1, "one"],
    [2, "few"],
    [4, "few"],
    [5, "many"],
    [21, "many"],
  ])("%i", (n, form) => {
    expect(plural(n, "one", "few", "many")).toBe(form);
  });
});

describe("lessonTitle", () => {
  const letter = { track: "letters", stage: 5 } as const;
  test("English", () => {
    expect(lessonTitle("en-us", letter, en)).toBe("Lesson 5 · e i");
    expect(lessonTitle("en-us", { track: "numbers", stage: 2 }, en)).toBe(
      "Numbers 2 · 6 7 8 9 0",
    );
    expect(lessonTitle("en-us", { track: "punctuation", stage: 1 }, en)).toBe(
      "Punctuation 1 · capitals",
    );
  });
  test("Czech", () => {
    expect(lessonTitle("en-us", letter, cs)).toBe("Lekce 5 · e i");
    expect(lessonTitle("en-us", { track: "punctuation", stage: 1 }, cs)).toBe(
      "Interpunkce 1 · velká písmena",
    );
  });
});

describe("feedbackText", () => {
  test.each([
    [{ rule: "unlocked", title: "Lesson 6" }, "Lesson 6 is unlocked."],
    [
      { rule: "accuracy", keys: ["F", "J"] },
      "Slow down and aim for accuracy, especially on F and J.",
    ],
    [
      { rule: "speed", keys: [] },
      "Accuracy is on target. Keep a steady rhythm to build speed.",
    ],
    [{ rule: "met", keys: ["F"] }, "Both targets met. F still needs practice."],
    [
      { rule: "met", keys: ["F", "J", "K"] },
      "Both targets met. F, J and K still need practice.",
    ],
  ] as const)("English %j", (feedback, expected) => {
    expect(feedbackText(feedback, en)).toBe(expected);
  });

  test("Czech", () => {
    expect(feedbackText({ rule: "met", keys: ["F", "J"] }, cs)).toBe(
      "Oba cíle jsou splněné. Klávesy F a J je ještě potřeba procvičit.",
    );
    expect(feedbackText({ rule: "accuracy", keys: ["K"] }, cs)).toBe(
      "Zpomalte a soustřeďte se na přesnost, zejména u klávesy K.",
    );
  });
});

describe("Czech counts", () => {
  test.each([
    [1, "1 neplatné cvičení v souboru bude přeskočeno."],
    [3, "3 neplatná cvičení v souboru budou přeskočena."],
    [5, "5 neplatných cvičení v souboru bude přeskočeno."],
  ])("skipped %i", (n, expected) => {
    expect(cs.data.skipped(n)).toBe(expected);
  });
});
