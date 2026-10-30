import { describe, expect, test } from "vitest";
import { enUs } from "./en-us";
import { DIGIT6_FINGER, type Layout } from "./layout";
import { fingerFor, strokesFor } from "./strokes";

describe("strokesFor en-us", () => {
  test.each([
    ["a", [{ code: "KeyA", shift: null }]],
    ["A", [{ code: "KeyA", shift: "ShiftRight" }]],
    ["P", [{ code: "KeyP", shift: "ShiftLeft" }]],
    ["!", [{ code: "Digit1", shift: "ShiftRight" }]],
    ["&", [{ code: "Digit7", shift: "ShiftLeft" }]],
    [":", [{ code: "Semicolon", shift: "ShiftLeft" }]],
    ["?", [{ code: "Slash", shift: "ShiftLeft" }]],
    [" ", [{ code: "Space", shift: null }]],
    ["\n", [{ code: "Enter", shift: null }]],
    ["\t", [{ code: "Tab", shift: null }]],
    ["é", undefined],
    ["", undefined],
  ])("%j", (char, expected) => {
    expect(strokesFor(enUs, char)).toEqual(expected);
  });

  test("every printable ASCII, newline and tab is one stroke", () => {
    const chars = [
      ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(0x20 + i)),
      "\n",
      "\t",
    ];
    for (const c of chars) expect(strokesFor(enUs, c)).toHaveLength(1);
  });

  test("returns the same array each time", () => {
    expect(strokesFor(enUs, "a")).toBe(strokesFor(enUs, "a"));
  });
});

describe("fingerFor en-us", () => {
  test.each([
    ["KeyF", "L2"],
    ["Space", "T"],
    ["ShiftRight", "R5"],
    ["Digit6", DIGIT6_FINGER],
    ["Nope", undefined],
  ])("%s", (code, expected) => {
    expect(fingerFor(enUs, code)).toBe(expected);
  });
});

const fixture: Layout = {
  id: "cs-qwertz",
  name: "fixture",
  locale: "cs-CZ",
  keys: [
    { code: "KeyA", row: 2, finger: "L5", base: "a", shift: "A" },
    { code: "KeyE", row: 1, finger: "L3", base: "e" },
    { code: "Digit2", row: 0, finger: "L4", base: "ě" },
    {
      code: "Equal",
      row: 0,
      finger: "R5",
      base: "",
      deadBase: "´",
      deadShift: "ˇ",
    },
  ],
  compose: {
    "´": { a: "á", A: "Á" },
    ˇ: { e: "ě", a: "ǎ" },
  },
};

describe("strokesFor with dead keys", () => {
  test.each([
    [
      "á",
      [
        { code: "Equal", shift: null },
        { code: "KeyA", shift: null },
      ],
    ],
    [
      "Á",
      [
        { code: "Equal", shift: null },
        { code: "KeyA", shift: "ShiftRight" },
      ],
    ],
    [
      "ǎ",
      [
        { code: "Equal", shift: "ShiftLeft" },
        { code: "KeyA", shift: null },
      ],
    ],
    ["ě", [{ code: "Digit2", shift: null }]],
  ])("%s", (char, expected) => {
    expect(strokesFor(fixture, char)).toEqual(expected);
  });
});
