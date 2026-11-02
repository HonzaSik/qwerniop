import { expect, test, vi } from "vitest";
import { defaultSettings } from "../core/settings/settings";
import { generatedText } from "./ai";

vi.mock("../ai/openai-compatible", () => ({
  createOpenAiProvider: () => ({}),
}));
vi.mock("../ai/modes", () => ({
  topicText: async () => "a passage",
}));

test("a topic passage says which topic it belongs to, trimmed", async () => {
  const base = defaultSettings().modelServer;
  const got = await generatedText(
    { ...base, enabled: true, model: "m", topic: " rust " },
    {
      layout: "en-us",
      lesson: { track: "letters", stage: 14 },
      letterStage: 14,
      stats: {},
      targets: { accuracy: 0.95, wpm: 40 },
      words: 20,
      wordList: [],
    },
    new AbortController().signal,
  );
  expect(got).toEqual({ text: "a passage", topic: "rust" });
});
