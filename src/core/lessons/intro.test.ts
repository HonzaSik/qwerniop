import { describe, expect, test } from "vitest";
import { csQwertz } from "../layouts/cs-qwertz";
import { enUs } from "../layouts/en-us";
import { seededRng } from "../text/rng";
import { keyDrill, keyGuide, markIntroduced, needsIntro } from "./intro";
import { initialProgress, parseProgress } from "./lessons";

describe("keyGuide", () => {
  test("a home key stays on the home row", () => {
    expect(keyGuide(enUs, "f")).toMatchObject({
      code: "KeyF",
      finger: "L2",
      home: "KeyF",
      rows: 0,
      side: "straight",
      shift: null,
    });
  });

  test("a reach up the stagger counts as straight", () => {
    expect(keyGuide(enUs, "r")).toMatchObject({
      home: "KeyF",
      rows: -1,
      side: "straight",
    });
    expect(keyGuide(enUs, "e")).toMatchObject({ home: "KeyD", rows: -1 });
  });

  test("index-finger stretches go sideways", () => {
    expect(keyGuide(enUs, "g")).toMatchObject({
      home: "KeyF",
      rows: 0,
      side: "right",
    });
    expect(keyGuide(enUs, "h")).toMatchObject({
      home: "KeyJ",
      rows: 0,
      side: "left",
    });
  });

  test("bottom row and number row", () => {
    expect(keyGuide(enUs, "b")).toMatchObject({ rows: 1, side: "right" });
    expect(keyGuide(enUs, "1")).toMatchObject({ home: "KeyA", rows: -2 });
  });

  test("a shifted character names the opposite Shift", () => {
    expect(keyGuide(enUs, "F")?.shift).toBe("ShiftRight");
    expect(keyGuide(enUs, "?")).toMatchObject({
      code: "Slash",
      shift: "ShiftLeft",
    });
  });

  test("space is the thumb's own home", () => {
    expect(keyGuide(enUs, " ")).toMatchObject({
      finger: "T",
      home: "Space",
      rows: 0,
      side: "straight",
    });
  });

  test("a dead-key character names the dead key first", () => {
    const guide = keyGuide(csQwertz, "ď");
    expect(guide?.code).toBe("KeyD");
    expect(guide?.dead).toEqual({
      code: "Equal",
      shift: "ShiftLeft",
      mark: "ˇ",
    });
  });

  test("a character the layout cannot type has no guide", () => {
    expect(keyGuide(enUs, "č")).toBeUndefined();
  });
});

describe("keyDrill", () => {
  test("uses only the given characters and spaces", () => {
    const text = keyDrill(["d", "k"], seededRng(1));
    expect(text).toMatch(/^[dk]+( [dk]+)*$/);
  });

  test("has the requested number of groups of 2 to 4", () => {
    const groups = keyDrill(["d", "k"], seededRng(2), 12).split(" ");
    expect(groups).toHaveLength(12);
    expect(groups.every((g) => g.length >= 2 && g.length <= 4)).toBe(true);
  });

  test("every character appears at least twice for any seed", () => {
    for (let seed = 0; seed < 50; seed++) {
      const text = keyDrill(["a", "s", "d"], seededRng(seed), 6);
      for (const c of "asd") {
        expect(text.split(c).length - 1).toBeGreaterThanOrEqual(2);
      }
    }
  });

  test("keeps every character twice when there are more characters than groups", () => {
    const chars = [..."abcdefghijklm"];
    const text = keyDrill(chars, seededRng(3), 12);
    for (const c of chars) {
      expect(text.split(c).length - 1).toBeGreaterThanOrEqual(2);
    }
  });

  test("is empty without characters", () => {
    expect(keyDrill([], seededRng(1))).toBe("");
  });
});

describe("needsIntro", () => {
  const fresh = initialProgress();

  test("a new learner gets the first lesson introduced", () => {
    expect(needsIntro("en-us", fresh, { track: "letters", stage: 1 })).toBe(
      true,
    );
  });

  test("an introduced stage is not introduced again", () => {
    const seen = markIntroduced("en-us", fresh, { track: "letters", stage: 1 });
    expect(needsIntro("en-us", seen, { track: "letters", stage: 1 })).toBe(
      false,
    );
    expect(needsIntro("en-us", seen, { track: "letters", stage: 2 })).toBe(
      true,
    );
  });

  test("lessons that add no key have no introduction", () => {
    expect(needsIntro("en-us", fresh, { track: "punctuation", stage: 1 })).toBe(
      false,
    );
    expect(needsIntro("en-us", fresh, { track: "code", stage: 4 })).toBe(false);
  });
});

describe("markIntroduced", () => {
  test("only moves forward", () => {
    const at3 = markIntroduced(
      "en-us",
      { ...initialProgress(), letters: 3 },
      { track: "letters", stage: 3 },
    );
    expect(at3.introduced.letters).toBe(3);
    expect(markIntroduced("en-us", at3, { track: "letters", stage: 2 })).toBe(
      at3,
    );
  });

  test("a stage not reached yet stays unintroduced, so its intro returns when it unlocks", () => {
    const fresh = initialProgress();
    expect(
      markIntroduced("en-us", fresh, { track: "letters", stage: 10 }),
    ).toBe(fresh);
    expect(markIntroduced("en-us", fresh, { track: "numbers", stage: 1 })).toBe(
      fresh,
    );
  });
});

describe("introduced in saved progress", () => {
  test("an older record counts every unlocked stage as introduced", () => {
    const got = parseProgress("en-us", { letters: 5, numbers: 2 });
    expect(got.introduced).toEqual({
      letters: 5,
      punctuation: 1,
      numbers: 2,
      code: 1,
    });
  });

  test("a saved value is kept, clamped, and a bad one falls back alone", () => {
    const got = parseProgress("en-us", {
      letters: 5,
      introduced: { letters: 3, punctuation: 99, numbers: -1, code: "x" },
    });
    expect(got.introduced.letters).toBe(3);
    expect(got.introduced.punctuation).toBeLessThan(99);
    expect(got.introduced.numbers).toBe(1);
    expect(got.introduced.code).toBe(1);
  });

  test("garbage gives a fresh learner with nothing introduced", () => {
    expect(parseProgress("en-us", null).introduced.letters).toBe(0);
  });
});
