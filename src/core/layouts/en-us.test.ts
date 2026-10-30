import { describe, expect, test } from "vitest";
import { enUs } from "./en-us";
import { DIGIT6_FINGER } from "./layout";

const key = (code: string) => enUs.keys.find((k) => k.code === code);

describe("en-us", () => {
  test("key codes are unique", () => {
    const codes = enUs.keys.map((k) => k.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  test("rows 0-3 are 15 units wide", () => {
    for (const row of [0, 1, 2, 3]) {
      const sum = enUs.keys
        .filter((k) => k.row === row)
        .reduce((n, k) => n + (k.width ?? 1), 0);
      expect(sum).toBe(15);
    }
  });

  test("produces each printable ASCII character exactly once", () => {
    const chars = enUs.keys
      .flatMap((k) => [k.base, k.shift ?? ""])
      .filter((c) => c !== "" && c !== "\t" && c !== "\n");
    const printable = Array.from({ length: 95 }, (_, i) =>
      String.fromCharCode(0x20 + i),
    );
    expect([...chars].sort()).toEqual(printable.sort());
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
    };
    for (const [code, finger] of Object.entries(expected)) {
      expect(key(code)?.finger, code).toBe(finger);
    }
  });

  test("has no dead keys", () => {
    expect(enUs.compose).toEqual({});
    expect(enUs.keys.some((k) => k.deadBase || k.deadShift)).toBe(false);
  });
});
