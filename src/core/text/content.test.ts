import { describe, expect, test } from "vitest";
import snippetRaw from "../../data/code/js.txt?raw";
import raw from "../../data/words/en.txt?raw";
import { enUs } from "../layouts/en-us";
import { strokesFor } from "../layouts/strokes";
import { unlockedLetters } from "../lessons/letters";
import {
  type Track,
  trackChars,
  trackStages,
  tracksOpen,
} from "../lessons/tracks";
import { defaultSettings } from "../settings/settings";
import { type ContentOptions, generateContent, parseSnippets } from "./content";
import { seededRng } from "./rng";

const targets = defaultSettings().targets;
const words = raw.split("\n").filter(Boolean);
const snippets = parseSnippets(snippetRaw);
const letters = unlockedLetters("en-us", 8) ?? "";
const make = (type: ContentOptions["type"], stage: number, seed = 1): string =>
  generateContent({
    type,
    words,
    snippets,
    letters,
    targets,
    stage,
    length: 60,
    rng: seededRng(seed),
  });
const typable = (text: string) =>
  [...text].every((c) => c === "\n" || strokesFor(enUs, c) !== undefined);
const only = (text: string, allowed: string) =>
  [...text].every((c) => allowed.includes(c));

describe("tracks", () => {
  test("open at letter step 8 for en-us only", () => {
    expect(tracksOpen("en-us", 7)).toBe(false);
    expect(tracksOpen("en-us", 8)).toBe(true);
    expect(tracksOpen("cs-qwertz", 14)).toBe(false);
  });

  test("stages only add characters, all typable", () => {
    for (const t of ["punctuation", "numbers", "code"] as Track[]) {
      for (let s = 1; s <= trackStages(t); s++) {
        expect(trackChars(t, s + 1).startsWith(trackChars(t, s))).toBe(true);
        expect(typable(trackChars(t, s))).toBe(true);
      }
    }
    expect(letters).toHaveLength(15);
  });
});

describe("generateContent", () => {
  test("is deterministic for a seed", () => {
    for (const t of ["words", "punctuation", "numbers", "code"] as const) {
      expect(make(t, 4)).toBe(make(t, 4));
      expect(make(t, 4, 1)).not.toBe(make(t, 4, 2));
    }
  });

  test("words emit unlocked letters only", () => {
    expect(only(make("words", 1), `${letters} `)).toBe(true);
  });

  test("punctuation text is weighted toward weak letters", () => {
    const strong = {
      attempts: 30,
      correct: 30,
      accuracy: 1,
      timed: 30,
      totalMs: 9000,
      ms: 300,
    };
    const all = Object.fromEntries([...letters].map((c) => [c, strong]));
    const count = (stats: Record<string, typeof strong>) =>
      generateContent({
        type: "punctuation",
        words,
        snippets,
        letters,
        stats,
        targets,
        stage: 1,
        length: 500,
        rng: seededRng(1),
      }).split("e").length;
    expect(count({ ...all, e: { ...strong, accuracy: 0.5 } })).toBeGreaterThan(
      count(all),
    );
  });

  test("punctuation stages add capitals, then marks, then brackets", () => {
    const base = `${letters}${letters.toUpperCase()} `;
    const s1 = make("punctuation", 1);
    expect(only(s1, base)).toBe(true);
    expect(s1).toMatch(/^[A-Z]/);
    expect(s1).toMatch(/ [A-Z]/);
    const s2 = make("punctuation", 2);
    expect(only(s2, `${base}.,`)).toBe(true);
    expect(s2).toMatch(/\./);
    expect(s2).toMatch(/,/);
    const s3 = make("punctuation", 3);
    expect(only(s3, `${base}.,?!'":;-`)).toBe(true);
    expect(s3).toMatch(/[?!]/);
    const s4 = make("punctuation", 4);
    expect(only(s4, `${base}.,?!'":;-()[]{}`)).toBe(true);
    expect(s4).toMatch(/[([{]/);
    for (const s of [s1, s2, s3, s4]) expect(typable(s)).toBe(true);
  });

  test("numbers use 1-5, then all digits", () => {
    const a = make("numbers", 1);
    expect(a).toMatch(/^[1-5 ]+$/);
    expect(a.split(" ")).toHaveLength(60);
    const b = make("numbers", 2);
    expect(b).toMatch(/^[0-9 ]+$/);
    expect(b).toMatch(/[6-90]/);
    expect(typable(b)).toBe(true);
  });

  test("code stages widen the symbol set; Enter only at stage 4", () => {
    const abc = "abcdefghijklmnopqrstuvwxyz ";
    const c1 = make("code", 1);
    expect(only(c1, `${abc}()[]{}`)).toBe(true);
    expect(c1).not.toContain("\n");
    const c2 = make("code", 2);
    expect(only(c2, `${abc}()[]{}=+-*/<>`)).toBe(true);
    expect(c2).toMatch(/[=+<>*/-]/);
    const c3 = make("code", 3);
    expect(only(c3, `${abc}()[]{}=+-*/<>_&|!?:;'"`)).toBe(true);
    expect(c3).toMatch(/[_&|!?:;'"]/);
    const c4 = make("code", 4);
    expect(c4).toContain("\n");
    expect(typable(c4)).toBe(true);
    for (const c of [c1, c2, c3]) expect(typable(c)).toBe(true);
  });
});

describe("built-in snippets", () => {
  test("each snippet is syntactically valid JavaScript", () => {
    // Parse only: identifiers like `price` are deliberately left undeclared.
    for (const s of snippets) expect(() => new Function(s)).not.toThrow();
  });

  test("parse into several snippets, typable, no dots, commas, digits or tabs", () => {
    expect(snippets.length).toBeGreaterThanOrEqual(8);
    for (const s of snippets) {
      expect(typable(s)).toBe(true);
      expect(s).not.toMatch(/[.,\d\t]/);
      expect(s).not.toMatch(/^\s/);
    }
  });
});
