import { describe, expect, it } from "vitest";
import {
  formatAccuracy,
  formatDuration,
  isRestartKey,
} from "./session-summary";

describe("formatAccuracy", () => {
  it("rounds to a whole percent", () => {
    expect(formatAccuracy(0.974)).toBe("97\u00a0%");
    expect(formatAccuracy(0)).toBe("0\u00a0%");
  });

  it("shows 100 % only for a session without errors", () => {
    expect(formatAccuracy(1)).toBe("100\u00a0%");
    expect(formatAccuracy(0.999)).toBe("99\u00a0%");
  });
});

describe("formatDuration", () => {
  it("shows minutes and two-digit seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65_000)).toBe("1:05");
  });

  it("carries rounded seconds into the minute", () => {
    expect(formatDuration(59_600)).toBe("1:00");
  });
});

describe("isRestartKey", () => {
  const press = (key: string) => ({
    key,
    repeat: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    defaultPrevented: false,
  });

  it("takes R in either case, on a button or not", () => {
    expect(isRestartKey(press("r"), false)).toBe(true);
    expect(isRestartKey(press("R"), true)).toBe(true);
  });

  it("takes Enter only away from a button, which handles it as a click", () => {
    expect(isRestartKey(press("Enter"), false)).toBe(true);
    expect(isRestartKey(press("Enter"), true)).toBe(false);
  });

  it("ignores other keys", () => {
    expect(isRestartKey(press("a"), false)).toBe(false);
  });

  it("leaves browser shortcuts such as Ctrl+R alone", () => {
    for (const modifier of ["ctrlKey", "metaKey", "altKey"]) {
      expect(isRestartKey({ ...press("r"), [modifier]: true }, false)).toBe(
        false,
      );
    }
  });

  it("ignores a held key and one the input already handled", () => {
    expect(isRestartKey({ ...press("r"), repeat: true }, false)).toBe(false);
    expect(
      isRestartKey({ ...press("Enter"), defaultPrevented: true }, false),
    ).toBe(false);
  });
});
