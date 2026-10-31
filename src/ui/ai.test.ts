import { describe, expect, test, vi } from "vitest";
import { defaultSettings } from "../core/settings/settings";
import {
  generatedFeedback,
  generatedRecap,
  generatedText,
  planMode,
} from "./ai";

const loaded = vi.hoisted(() => vi.fn());
vi.mock("../ai/openai-compatible", () => {
  loaded();
  return {};
});

const server = (over: Partial<ReturnType<typeof base>> = {}) => ({
  ...base(),
  ...over,
});
const base = () => ({
  ...defaultSettings().modelServer,
  enabled: true,
  model: "m",
});
const letters = { track: "letters", stage: 3 } as const;
const code = (stage: number) => ({ track: "code", stage }) as const;

describe("planMode", () => {
  test("nothing without an enabled server and a model", () => {
    expect(planMode(defaultSettings().modelServer, "en-us", letters, 20)).toBe(
      undefined,
    );
    expect(planMode(server({ model: "" }), "en-us", letters, 20)).toBe(
      undefined,
    );
  });

  test("lesson text needs 12 letters", () => {
    expect(planMode(server(), "en-us", letters, 5)).toBe(undefined);
    expect(planMode(server(), "en-us", letters, 7)).toBe("lesson");
  });

  test("topic needs every letter and a topic, and then wins", () => {
    const withTopic = server({ topic: "rust" });
    expect(planMode(withTopic, "en-us", letters, 12)).toBe("lesson");
    expect(planMode(withTopic, "en-us", letters, 99)).toBe("topic");
    expect(planMode(server(), "en-us", letters, 99)).toBe("lesson");
  });

  test("code only from whole snippets", () => {
    expect(planMode(server(), "en-us", code(3), 99)).toBe(undefined);
    expect(planMode(server(), "en-us", code(4), 99)).toBe("code");
  });

  test("a mode switched off is skipped", () => {
    const modes = { lesson: false, topic: false, code: false, feedback: true };
    expect(planMode(server({ modes, topic: "x" }), "en-us", letters, 99)).toBe(
      undefined,
    );
    expect(planMode(server({ modes }), "en-us", code(4), 99)).toBe(undefined);
  });

  test("other tracks stay offline", () => {
    expect(
      planMode(server(), "en-us", { track: "numbers", stage: 1 }, 99),
    ).toBe(undefined);
  });
});

test("a disabled server never loads the ai chunk", async () => {
  const off = defaultSettings().modelServer;
  const request = {
    layout: "en-us",
    lesson: letters,
    letterStage: 99,
    stats: {},
    targets: { accuracy: 0.95, wpm: 40 },
    words: 20,
    wordList: [],
  } as const;
  await generatedText(off, request, new AbortController().signal);
  await generatedRecap({ ...off, model: "m" }, "en-us", {
    topic: "t",
    passages: ["p"],
  });
  await generatedFeedback(off, {
    layout: "en-us",
    wpm: 40,
    accuracy: 0.9,
    weakest: [],
  });
  expect(loaded).not.toHaveBeenCalled();
});
