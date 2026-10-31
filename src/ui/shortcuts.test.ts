import { describe, expect, it } from "vitest";
import { isBackKey, isHelpKey, isSettingsKey } from "./shortcuts";

const press = (key: string, extra = {}) => ({
  key,
  repeat: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  defaultPrevented: false,
  ...extra,
});

describe("shortcuts", () => {
  it("fire from the page body", () => {
    expect(isHelpKey(press("?"), { tagName: "BODY" })).toBe(true);
    expect(isBackKey(press("Escape"), { tagName: "BODY" })).toBe(true);
    expect(isSettingsKey(press(","), { tagName: "BODY" })).toBe(true);
  });

  it("never fire while typing in a field", () => {
    for (const tagName of ["TEXTAREA", "INPUT", "SELECT"]) {
      const el = { tagName };
      expect(isHelpKey(press("?"), el)).toBe(false);
      expect(isBackKey(press("Escape"), el)).toBe(false);
      expect(isSettingsKey(press(","), el)).toBe(false);
    }
  });

  it("ignore prevented, repeated and modified keys", () => {
    expect(isHelpKey(press("?", { defaultPrevented: true }), null)).toBe(false);
    expect(isHelpKey(press("?", { repeat: true }), null)).toBe(false);
    expect(isHelpKey(press("?", { ctrlKey: true }), null)).toBe(false);
    expect(isBackKey(press("Escape", { altKey: true }), null)).toBe(false);
  });
});
