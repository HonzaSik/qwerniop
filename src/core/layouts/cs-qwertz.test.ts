import { describe, expect, test } from "vitest";
import { csQwertz } from "./cs-qwertz";
import { DIGIT6_FINGER } from "./layout";

const key = (code: string) => csQwertz.keys.find((k) => k.code === code);

describe("cs-qwertz", () => {
  test("key codes are unique", () => {
    const codes = csQwertz.keys.map((k) => k.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  // The ISO Enter spans rows 1 and 2 but is listed once in row 2, so the top
  // of Enter leaves row 1 half a unit short.
  test("row widths", () => {
    const expected = { 0: 15, 1: 13.5, 2: 15, 3: 15 };
    for (const [row, width] of Object.entries(expected)) {
      const sum = csQwertz.keys
        .filter((k) => k.row === Number(row))
        .reduce((n, k) => n + (k.width ?? 1), 0);
      expect(sum, `row ${row}`).toBe(width);
    }
  });

  test("produces each printable character exactly once", () => {
    const chars = csQwertz.keys
      .flatMap((k) => [k.base, k.shift ?? ""])
      .filter((c) => c !== "" && c !== "\t" && c !== "\n");
    const altGrOnly = new Set("`~@#$^&*[]{}<>");
    const ascii = Array.from({ length: 95 }, (_, i) =>
      String.fromCharCode(0x20 + i),
    ).filter((c) => !altGrOnly.has(c));
    const expected = [...ascii, ..."ěščřžýáíéúů§"];
    expect(expected).toHaveLength(93);
    expect([...chars].sort()).toEqual(expected.sort());
  });

  test("finger map", () => {
    const expected: Record<string, string> = {
      KeyA: "L5",
      KeyS: "L4",
      KeyD: "L3",
      KeyF: "L2",
      KeyJ: "R2",
      KeyK: "R3",
      KeyL: "R4",
      Semicolon: "R5",
      Space: "T",
      Digit6: DIGIT6_FINGER,
      ShiftLeft: "L5",
      ShiftRight: "R5",
      Backspace: "R5",
      Tab: "L5",
      IntlBackslash: "L5",
      KeyZ: "L5",
      KeyY: "R2",
      Backslash: "R5",
      Enter: "R5",
    };
    for (const [code, finger] of Object.entries(expected)) {
      expect(key(code)?.finger, code).toBe(finger);
    }
  });

  test("dead keys", () => {
    expect(key("Equal")).toMatchObject({
      base: "",
      deadBase: "´",
      deadShift: "ˇ",
    });
    expect(key("Backslash")).toMatchObject({
      base: "",
      deadBase: "¨",
      shift: "'",
    });
    expect(key("Backquote")).toMatchObject({ base: ";", deadShift: "˚" });
  });
});
