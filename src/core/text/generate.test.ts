import { describe, expect, test } from "vitest";
import raw from "../../data/words/en.txt?raw";
import { unlockedLetters } from "../lessons/letters";
import { generate, MIN_WORDS } from "./generate";
import { seededRng } from "./rng";

const words = raw.split("\n").filter(Boolean);
const run = (allowed: string, seed = 1) =>
  generate({ words, allowed, length: 30, rng: seededRng(seed) });

describe("generate", () => {
  test("is deterministic for a seed and differs across seeds", () => {
    expect(run("fjdksla")).toBe(run("fjdksla"));
    expect(run("fjdksla", 1)).not.toBe(run("fjdksla", 2));
  });

  test("first lesson is pseudo-words of unlocked letters only", () => {
    const text = run("fj");
    expect(text.split(" ")).toHaveLength(30);
    expect(text).toMatch(/^[fj ]+$/);
    expect(text.split(" ").every((w) => w.length >= 3 && w.length <= 5)).toBe(
      true,
    );
  });

  test("pseudo-words follow the language's bigrams", () => {
    // In English "th" is common and "ht" rare; letters t,h only.
    const text = generate({
      words,
      allowed: "th",
      length: 400,
      rng: seededRng(3),
    });
    const count = (s: string) => text.split(s).length - 1;
    expect(count("th")).toBeGreaterThan(count("ht"));
  });

  test("falls back below the threshold, uses real words at or above it", () => {
    const fits = (a: string) =>
      words.filter((w) => [...w].every((c) => a.includes(c))).length;
    const small = unlockedLetters("en-us", 4) ?? "";
    const big = unlockedLetters("en-us", 6) ?? "";
    expect(fits(small)).toBeLessThan(MIN_WORDS);
    expect(fits(big)).toBeGreaterThanOrEqual(MIN_WORDS);
    const real = new Set(words);
    expect(
      run(big)
        .split(" ")
        .every((w) => real.has(w)),
    ).toBe(true);
    expect(run(small)).toMatch(new RegExp(`^[${small} ]+$`));
  });

  test("returns empty text when nothing is allowed", () => {
    expect(run("")).toBe("");
  });
});
