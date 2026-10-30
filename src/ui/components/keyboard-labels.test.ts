import { describe, expect, it } from "vitest";
import { enUs } from "../../core/layouts/en-us";
import { keyLabel } from "./keyboard-labels";

function label(code: string) {
  const key = enUs.keys.find((k) => k.code === code);
  if (!key) throw new Error(code);
  return keyLabel(key);
}

describe("keyLabel", () => {
  it("shows letters as capitals only", () => {
    expect(label("KeyA")).toEqual({ main: "A", shift: "" });
  });
  it("shows base and shift for symbol keys", () => {
    expect(label("Digit1")).toEqual({ main: "1", shift: "!" });
  });
  it("names keys that type nothing or whitespace", () => {
    expect(label("ShiftLeft").main).toBe("Shift");
    expect(label("Enter").main).toBe("Enter");
    expect(label("Space").main).toBe("");
  });
  it("labels every key", () => {
    for (const key of enUs.keys) {
      if (key.code !== "Space") expect(keyLabel(key).main).not.toBe("");
    }
  });
});
