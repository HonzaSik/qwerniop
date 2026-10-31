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

  test("layout is kept when known and falls back to en-us otherwise", () => {
    expect(migrateSettings({ layout: "cs-qwertz" }).layout).toBe("cs-qwertz");
    expect(migrateSettings({ layout: "dvorak" }).layout).toBe("en-us");
    expect(migrateSettings({}).layout).toBe("en-us");
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

  test("targets default to 95 % and 35 wpm", () => {
    expect(defaultSettings().targets).toEqual({ accuracy: 0.95, wpm: 35 });
    expect(migrateSettings({}).targets).toEqual({ accuracy: 0.95, wpm: 35 });
  });

  test("each target falls back alone and a valid pair is kept", () => {
    expect(
      migrateSettings({ targets: { accuracy: 0.5, wpm: 35 } }).targets,
    ).toEqual({ accuracy: 0.95, wpm: 35 });
    expect(
      migrateSettings({ targets: { accuracy: 0.98, wpm: 7 } }).targets,
    ).toEqual({ accuracy: 0.98, wpm: 35 });
    expect(
      migrateSettings({ targets: { accuracy: 0.9, wpm: 60 } }).targets,
    ).toEqual({ accuracy: 0.9, wpm: 60 });
  });
});
