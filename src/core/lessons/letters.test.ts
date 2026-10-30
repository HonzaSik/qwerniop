import { describe, expect, test } from "vitest";
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
    expect(unlockedLetters("cs-qwertz", 1)).toBeUndefined();
  });
});
