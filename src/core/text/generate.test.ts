import { describe, expect, test } from "vitest";
import raw from "../../data/words/en.txt?raw";
import { unlockedLetters } from "../lessons/letters";
import type { CharStat, CharStats } from "../stats/chars";
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

  describe("with stats", () => {
    const letters = unlockedLetters("en-us", 6) ?? "";
    const strong: CharStat = {
      attempts: 30,
      correct: 30,
      accuracy: 1,
      timed: 30,
      totalMs: 9000,
      ms: 300,
    };
    const weak: CharStat = { ...strong, accuracy: 0.5, ms: 1500 };
    const allStrong = (allowed: string, extra: CharStats = {}): CharStats => ({
      ...Object.fromEntries([...allowed].map((c) => [c, strong])),
      ...extra,
    });
    const make = (allowed: string, stats: CharStats, seed = 1) =>
      generate({ words, allowed, stats, length: 2000, rng: seededRng(seed) });
    const share = (text: string, c: string) => {
      const ws = text.split(" ");
      return ws.filter((w) => w.includes(c)).length / ws.length;
    };

    test("a weak letter makes its words likelier but not exclusive", () => {
      const k = letters.includes("k") ? "k" : (letters.at(-1) ?? "");
      const base = make(letters, allStrong(letters));
      const text = make(letters, allStrong(letters, { [k]: weak }));
      expect(share(text, k)).toBeGreaterThan(share(base, k));
      expect(1 - share(text, k)).toBeGreaterThanOrEqual(0.1);
    });

    test("stats for characters that are not allowed change nothing", () => {
      const extra = { z: weak, A: weak, ".": weak };
      expect(make(letters, extra)).toBe(make(letters, {}));
    });

    test("no word repeats within the previous eight", () => {
      const ws = make(letters, {}).split(" ");
      for (const [i, w] of ws.entries()) {
        expect(ws.slice(Math.max(0, i - 8), i)).not.toContain(w);
      }
    });

    test("pseudo-words favour a weak letter", () => {
      const base = make("fjdk", allStrong("fjdk"));
      const text = make("fjdk", allStrong("fjdk", { k: weak }));
      const count = (t: string) => t.split("k").length - 1;
      expect(count(text)).toBeGreaterThan(count(base));
    });

    test("is deterministic with stats", () => {
      const stats = allStrong(letters, { e: weak });
      expect(make(letters, stats)).toBe(make(letters, stats));
    });
  });
});
