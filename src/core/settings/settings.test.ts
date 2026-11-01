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

  test("reduceMotion is kept when known and falls back to system otherwise", () => {
    expect(migrateSettings({ reduceMotion: "on" }).reduceMotion).toBe("on");
    expect(migrateSettings({ reduceMotion: "off" }).reduceMotion).toBe("off");
    expect(migrateSettings({ reduceMotion: "maybe" }).reduceMotion).toBe(
      "system",
    );
    expect(migrateSettings({}).reduceMotion).toBe("system");
  });

  test("language is kept when known and falls back to system otherwise", () => {
    expect(migrateSettings({ language: "cs" }).language).toBe("cs");
    expect(migrateSettings({ language: "en" }).language).toBe("en");
    expect(migrateSettings({ language: "de" }).language).toBe("system");
    expect(migrateSettings({}).language).toBe("system");
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

  test("validates each model server field alone", () => {
    expect(
      migrateSettings({
        modelServer: { baseUrl: "http://x/v1", model: 3, apiKey: "k" },
      }).modelServer,
    ).toEqual({
      ...defaultSettings().modelServer,
      baseUrl: "http://x/v1",
      apiKey: "k",
    });
    expect(migrateSettings({ modelServer: 7 }).modelServer).toEqual(
      defaultSettings().modelServer,
    );
    expect(defaultSettings().modelServer.baseUrl).toBe(
      "http://localhost:11434/v1",
    );
  });

  test("keeps model switches and the topic, repairing bad ones alone", () => {
    const server = migrateSettings({
      modelServer: {
        enabled: true,
        modes: { lesson: false, code: "no" },
        topic: "rust",
      },
    }).modelServer;
    expect(server.enabled).toBe(true);
    expect(server.modes).toEqual({
      lesson: false,
      topic: true,
      code: true,
      feedback: true,
    });
    expect(server.topic).toBe("rust");
    expect(defaultSettings().modelServer.enabled).toBe(false);
  });

  test("appearance fields are kept when known and fall back otherwise", () => {
    const got = migrateSettings({
      theme: "oled",
      accent: "green",
      textSize: "large",
      caret: "block",
      liveStats: true,
    });
    expect(got.theme).toBe("oled");
    expect(got.accent).toBe("green");
    expect(got.textSize).toBe("large");
    expect(got.caret).toBe("block");
    expect(got.liveStats).toBe(true);
    const bad = migrateSettings({
      theme: "sepia",
      accent: "#ff0000",
      textSize: 3,
      caret: "beam",
      liveStats: "yes",
    });
    expect(bad.theme).toBe("system");
    expect(bad.accent).toBe("blue");
    expect(bad.textSize).toBe("medium");
    expect(bad.caret).toBe("bar");
    expect(bad.liveStats).toBe(false);
  });

  test("the longer length list keeps old values and accepts new ones", () => {
    expect(
      migrateSettings({ length: { kind: "seconds", amount: 600 } }).length,
    ).toEqual({ kind: "seconds", amount: 600 });
    expect(
      migrateSettings({ length: { kind: "words", amount: 200 } }).length,
    ).toEqual({ kind: "words", amount: 200 });
    expect(
      migrateSettings({ length: { kind: "words", amount: 15 } }).length,
    ).toEqual({ kind: "words", amount: 15 });
  });
});
