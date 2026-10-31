import { describe, expect, it } from "vitest";
import { isPhysicalCode } from "./physicalKey";

describe("isPhysicalCode", () => {
  it("accepts real key codes", () => {
    expect(isPhysicalCode("KeyA")).toBe(true);
    expect(isPhysicalCode("Space")).toBe(true);
  });
  it("rejects what on-screen keyboards send", () => {
    expect(isPhysicalCode("")).toBe(false);
    expect(isPhysicalCode("Unidentified")).toBe(false);
  });
});
