import { describe, expect, test } from "vitest";
import { defaultSettings, migrateSettings } from "./settings";

describe("migrateSettings", () => {
  test("round-trips valid settings", () => {
    const s = {
      ...defaultSettings(),
      keyboardMode: "hidden" as const,
      errorMode: "continue" as const,
      length: { kind: "seconds" as const, amount: 60 },
    };
    expect(migrateSettings(s)).toEqual(s);
  });

  test.each([undefined, null, 5, "x", []])("falls back for %j", (v) => {
    expect(migrateSettings(v)).toEqual(defaultSettings());
  });

  test("a partial or older record keeps its valid fields", () => {
    expect(migrateSettings({ keyboardMode: "next" })).toEqual({
      ...defaultSettings(),
      keyboardMode: "next",
    });
  });

  test("an invalid field falls back without dropping the others", () => {
    const got = migrateSettings({
      keyboardMode: "bogus",
      errorMode: "continue",
      length: { kind: "words", amount: 7 },
    });
    expect(got.keyboardMode).toBe("fingers");
    expect(got.length).toEqual({ kind: "words", amount: 30 });
    expect(got.errorMode).toBe("continue");
  });

  test("stamps the current version and ignores unknown fields", () => {
    const got = migrateSettings({ version: 0, extra: 1 });
    expect(got).toEqual(defaultSettings());
  });
});
