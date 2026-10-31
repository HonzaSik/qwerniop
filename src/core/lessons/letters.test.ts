import { describe, expect, test } from "vitest";
import { csQwertz } from "../layouts/cs-qwertz";
import { enUs } from "../layouts/en-us";
import { strokesFor } from "../layouts/strokes";
import { stageCount, unlockedLetters } from "./letters";

describe("en-us letter order", () => {
  test("starts on the home row with f j", () => {
    expect(unlockedLetters("en-us", 1)).toBe("fj");
    expect(unlockedLetters("en-us", 3)).toBe("fjdksl");
  });

  test("covers a to z exactly once, each typable", () => {
    const all = unlockedLetters("en-us", stageCount("en-us")) ?? "";
    expect([...all].sort().join("")).toBe("abcdefghijklmnopqrstuvwxyz");
    for (const c of all) expect(strokesFor(enUs, c)).toBeDefined();
  });

  test("clamps stages and reports layouts without an order", () => {
    expect(unlockedLetters("en-us", 0)).toBe("");
    expect(unlockedLetters("en-us", 99)).toHaveLength(26);
  });
});

describe("cs-qwertz letter order", () => {
  test("covers a to z and the number-row letters once, each typable", () => {
    const all = unlockedLetters("cs-qwertz", stageCount("cs-qwertz")) ?? "";
    expect(new Set(all).size).toBe(37);
    for (const c of "abcdefghijklmnopqrstuvwxyzáíéěščřžýúů") {
      expect(all).toContain(c);
    }
    for (const c of all) expect(strokesFor(csQwertz, c)).toHaveLength(1);
  });

  test("teaches number-row letters after the base letters", () => {
    expect(unlockedLetters("cs-qwertz", 13)).toBe("fjdkslaeiontrvupmhczybgxwq");
  });
});
