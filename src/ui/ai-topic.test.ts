import { beforeEach, expect, test, vi } from "vitest";
import { defaultSettings } from "../core/settings/settings";
import { generatedText, passageShown, type TopicStore } from "./ai";

const topicText = vi.hoisted(() => vi.fn());
vi.mock("../ai/openai-compatible", () => ({
  createOpenAiProvider: () => ({}),
}));
vi.mock("../ai/modes", () => ({ topicText }));

const signal = new AbortController().signal;
const server = (topic: string) => ({
  ...defaultSettings().modelServer,
  enabled: true,
  model: "m",
  topic,
});
const request = {
  layout: "en-us",
  lesson: { track: "letters", stage: 14 },
  letterStage: 14,
  stats: {},
  targets: { accuracy: 0.95, wpm: 40 },
  words: 20,
  wordList: [],
} as const;
const store = (): TopicStore & { saved: unknown[] } => {
  const saved: unknown[] = [];
  return {
    saved,
    load: async () => undefined,
    save: (_topic, history) => saved.push(history),
  };
};

beforeEach(() => {
  topicText.mockReset();
  topicText.mockResolvedValue("a passage");
});

test("a topic passage says which topic it belongs to, trimmed", async () => {
  const got = await generatedText(server(" rust "), request, signal);
  expect(got).toEqual({ text: "a passage", topic: "rust" });
});

test("a passage never shown leaves no trace in the topic's history", async () => {
  const topics = store();
  await generatedText(server("unseen"), request, signal, topics);
  await generatedText(server("unseen"), request, signal, topics);
  expect(topics.saved).toEqual([]);
  expect(topicText.mock.calls[1]?.[2].previous).toBeUndefined();
});

test("the next passage continues from the one shown", async () => {
  const topics = store();
  const got = await generatedText(server("shown"), request, signal, topics);
  passageShown(got, topics);
  await generatedText(server("shown"), request, signal, topics);
  expect(topics.saved).toHaveLength(1);
  expect(topicText.mock.calls[1]?.[2].previous).toBe("a passage");
});

test("the recap falls on every third passage shown, not generated", async () => {
  const topics = store();
  const gen = () => generatedText(server("recap"), request, signal, topics);
  await gen();
  expect(passageShown(await gen(), topics)?.recap).toBeUndefined();
  expect(passageShown(await gen(), topics)?.recap).toBeUndefined();
  const third = passageShown(await gen(), topics);
  expect(third?.recap?.topic).toBe("recap");
});

test("text that is not a topic passage passes through untouched", () => {
  const topics = store();
  expect(passageShown({ text: "x" }, topics)).toEqual({ text: "x" });
  expect(passageShown(undefined, topics)).toBeUndefined();
  expect(topics.saved).toEqual([]);
});
