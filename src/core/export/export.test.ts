import { describe, expect, it } from "vitest";
import { initialProgress } from "../lessons/lessons";
import { defaultSettings } from "../settings/settings";
import { buildExport, parseExport } from "./export";

const session = {
  at: 1,
  layout: "en-us",
  mode: "stop",
  lesson: { track: "letters", stage: 2 },
  wpm: 30,
  accuracy: 0.9,
  durationMs: 5000,
  errors: { e: 1 },
};
const file = (over: Record<string, unknown> = {}) => ({
  app: "tenfold",
  schema: 1,
  settings: defaultSettings(),
  progress: { "en-us": { ...initialProgress(), letters: 3 } },
  sessions: [session],
  ...over,
});

describe("buildExport", () => {
  it("leaves the model server out", () => {
    const settings = {
      ...defaultSettings(),
      modelServer: {
        ...defaultSettings().modelServer,
        baseUrl: "http://h/v1",
        model: "m",
        apiKey: "secret",
      },
    };
    const text = buildExport(
      {
        settings,
        progress: {
          "en-us": initialProgress(),
          "cs-qwertz": initialProgress(),
        },
        sessions: [],
      },
      new Date(0),
    );
    expect(text).not.toContain("secret");
    expect(text).not.toContain("modelServer");
  });
});

describe("language in export", () => {
  it("travels with the settings", () => {
    const text = buildExport(
      {
        settings: { ...defaultSettings(), language: "cs" },
        progress: {
          "en-us": initialProgress(),
          "cs-qwertz": initialProgress(),
        },
        sessions: [],
      },
      new Date(0),
    );
    const r = parseExport(JSON.parse(text));
    expect(r.ok && r.value.settings.language).toBe("cs");
  });
});

describe("parseExport", () => {
  it("round-trips an export", () => {
    const data = {
      settings: defaultSettings(),
      progress: {
        "en-us": initialProgress(),
        "cs-qwertz": initialProgress(),
      },
      sessions: [],
    };
    const text = buildExport(data, new Date(0));
    expect(parseExport(JSON.parse(text))).toEqual({
      ok: true,
      value: data,
      droppedSessions: 0,
    });
  });

  it("carries the saved lesson with progress", () => {
    const cs = {
      ...initialProgress(),
      letters: 5,
      lesson: { track: "letters", stage: 3 },
    };
    const r = parseExport(file({ progress: { "cs-qwertz": cs } }));
    expect(r.ok && r.value.progress["cs-qwertz"].lesson.stage).toBe(3);
    const bad = { ...cs, lesson: { track: "letters", stage: 9 } };
    const b = parseExport(file({ progress: { "cs-qwertz": bad } }));
    expect(b.ok && b.value.progress["cs-qwertz"].lesson.stage).toBe(1);
  });

  it("keeps progress per layout", () => {
    const cs = { ...initialProgress(), letters: 5 };
    const r = parseExport(file({ progress: { "cs-qwertz": cs } }));
    expect(r.ok && r.value.progress["cs-qwertz"].letters).toBe(5);
    expect(r.ok && r.value.progress["en-us"]).toEqual(initialProgress());
  });

  it("keeps valid parts", () => {
    const r = parseExport(file());
    expect(r.ok && r.value.progress["en-us"].letters).toBe(3);
    expect(r.ok && r.value.sessions).toHaveLength(1);
  });

  it.each([
    ["garbage", 5],
    ["null", null],
    ["an array", []],
    ["another app", { app: "other", schema: 1 }],
  ])("rejects %s", (_, raw) => {
    expect(parseExport(raw).ok).toBe(false);
  });

  it("rejects a missing or bad version", () => {
    for (const schema of [undefined, "1", 0, 1.5]) {
      const r = parseExport(file({ schema }));
      expect(r.ok === false && r.reason).toBe("noFormat");
    }
  });

  it("rejects a newer version", () => {
    const r = parseExport(file({ schema: 2 }));
    expect(r.ok === false && r.reason).toBe("newer");
  });

  it("rejects a missing session list", () => {
    expect(parseExport(file({ sessions: undefined })).ok).toBe(false);
  });

  it("drops bad sessions and counts them", () => {
    const r = parseExport(file({ sessions: [session, { at: "x" }, null] }));
    expect(r.ok && r.droppedSessions).toBe(2);
    expect(r.ok && r.value.sessions).toEqual([session]);
  });

  it("repairs bad settings and progress instead of failing", () => {
    const r = parseExport(file({ settings: 7, progress: "no" }));
    expect(r.ok && r.value.settings).toEqual(defaultSettings());
    expect(r.ok && r.value.progress["en-us"]).toEqual(initialProgress());
  });

  it("keeps stats through a round trip and reads old progress as empty stats", () => {
    const stat = {
      attempts: 2,
      correct: 1,
      accuracy: 0.5,
      timed: 1,
      ms: 300,
      totalMs: 300,
    };
    const pair = {
      attempts: 2,
      correct: 1,
      timed: 1,
      totalMs: 300,
      ms: 300,
      earlyMs: 300,
    };
    const data = {
      settings: defaultSettings(),
      progress: {
        "en-us": {
          ...initialProgress(),
          stats: { a: stat },
          pairs: { th: pair },
        },
        "cs-qwertz": initialProgress(),
      },
      sessions: [],
    };
    const r = parseExport(JSON.parse(buildExport(data, new Date(0))));
    expect(r.ok && r.value.progress["en-us"].stats).toEqual({ a: stat });
    expect(r.ok && r.value.progress["en-us"].pairs).toEqual({ th: pair });
    const { stats: _, ...old } = initialProgress();
    const o = parseExport(file({ progress: { "en-us": old } }));
    expect(o.ok && o.value.progress["en-us"].stats).toEqual({});
  });
});
