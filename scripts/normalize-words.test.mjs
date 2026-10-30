import { expect, it } from "vitest";
import { normalize } from "./normalize-words.mjs";

const canType = (c) => /[a-z]/.test(c);

it("sorts by summed count, merges case, drops proper nouns", () => {
  const raw = [
    "1\tThe\t10",
    "2\tthe\t90",
    "3\tParis\t50",
    "4\tcat\t40",
    "5\tbat\t40",
  ];
  expect(normalize(raw, { canType })).toEqual(["the", "bat", "cat"]);
});

it("keeps first occurrence order of plain lists and dedupes", () => {
  expect(normalize(["dog", "cat", "dog"], { canType })).toEqual(["dog", "cat"]);
});

it("drops untypeable chars, non-letters, blocked words, stray singles", () => {
  const raw = ["café", "it's", "x1", "bad", "a", "b", "ok"];
  expect(
    normalize(raw, { canType, blocked: new Set(["bad"]), singles: ["a"] }),
  ).toEqual(["a", "ok"]);
});

it("applies NFC and the limit", () => {
  const raw = ["éa", "xx", "yy"];
  expect(normalize(raw, { canType: () => true, limit: 2 })).toEqual([
    "éa",
    "xx",
  ]);
});
