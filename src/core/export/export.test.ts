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

describe("parseExport", () => {
  it("round-trips an export", () => {
    const data = {
      settings: defaultSettings(),
      progress: { "en-us": initialProgress() },
      sessions: [],
    };
    const text = buildExport(data, new Date(0));
    expect(parseExport(JSON.parse(text))).toEqual({
      ok: true,
      value: data,
      droppedSessions: 0,
    });
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
      expect(r.ok === false && r.reason).toMatch(/version/);
    }
  });

  it("rejects a newer version", () => {
    const r = parseExport(file({ schema: 2 }));
    expect(r.ok === false && r.reason).toMatch(/newer/);
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
});
