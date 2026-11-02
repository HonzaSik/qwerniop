import { describe, expect, it } from "vitest";
import { isBackKey, isHelpKey, isSettingsKey, isStartKey } from "./shortcuts";

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

  it("start only when no control would take the Enter itself", () => {
    expect(isStartKey(press("Enter"), { tagName: "BODY" })).toBe(true);
    expect(isStartKey(press("x"), { tagName: "BODY" })).toBe(false);
    expect(
      isStartKey(press("Enter", { repeat: true }), { tagName: "BODY" }),
    ).toBe(false);
    for (const tagName of ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"]) {
      expect(isStartKey(press("Enter"), { tagName })).toBe(false);
    }
  });

  it("never fire while typing in a field", () => {
    for (const tagName of ["TEXTAREA", "INPUT", "SELECT"]) {
      const el = { tagName };
      expect(isHelpKey(press("?"), el)).toBe(false);
      expect(isBackKey(press("Escape"), el)).toBe(false);
      expect(isSettingsKey(press(","), el)).toBe(false);
    }
  });

  it("never fire from inside an open dialog, which handles its own Esc", () => {
    const el = { tagName: "BUTTON", closest: () => ({}) };
    expect(isHelpKey(press("?"), el)).toBe(false);
    expect(isBackKey(press("Escape"), el)).toBe(false);
    expect(isSettingsKey(press(","), el)).toBe(false);
  });

  it("still fire from an element outside any dialog", () => {
    const el = { tagName: "BUTTON", closest: () => null };
    expect(isBackKey(press("Escape"), el)).toBe(true);
  });

  it("ignore prevented, repeated and modified keys", () => {
    expect(isHelpKey(press("?", { defaultPrevented: true }), null)).toBe(false);
    expect(isHelpKey(press("?", { repeat: true }), null)).toBe(false);
    expect(isHelpKey(press("?", { ctrlKey: true }), null)).toBe(false);
    expect(isBackKey(press("Escape", { altKey: true }), null)).toBe(false);
  });
});
