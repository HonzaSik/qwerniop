import { describe, expect, test } from "vitest";
import { enUs } from "../core/layouts/en-us";
import { codeText, feedbackSentence, lessonText, topicText } from "./modes";
import { codeRequest } from "./prompts/code";
import { feedbackRequest } from "./prompts/feedback";
import { lessonRequest } from "./prompts/lesson";
import { topicRequest } from "./prompts/topic";
import { ProviderError, type TextProvider } from "./provider";

function fake(chunks: string[], failAfter?: Error): TextProvider {
  return {
    listModels: async () => [],
    async *stream() {
      for (const c of chunks) yield c;
      if (failAfter) throw failAfter;
    },
  };
}

const lesson = {
  language: "en",
  letters: "etaoinshrdl",
  weak: ["d", "l"],
  words: 10,
} as const;
const topic = { language: "en", topic: "vaccines" } as const;
const passage =
  "A vaccine shows the body a harmless piece of a virus. The immune system learns to recognise it. Later it reacts fast and protects you from the real illness, which is why doctors suggest vaccines.";

describe("prompts", () => {
  test("lesson names the letters and the weak ones, in the target language", () => {
    const en = lessonRequest(lesson).prompt;
    expect(en).toContain("e t a o i n s h r d l");
    expect(en).toContain("Use the letters d l often");
    expect(lessonRequest({ ...lesson, language: "cs" }).prompt).toContain(
      "Napiš asi 10 slov",
    );
  });

  test("lesson omits the weak-letter sentence when there are none", () => {
    expect(lessonRequest({ ...lesson, weak: [] }).prompt).not.toContain(
      "often",
    );
  });

  test("topic adds the previous passage only when given", () => {
    expect(topicRequest(topic).prompt).not.toContain("previous");
    const next = topicRequest({ ...topic, previous: "It began." }).prompt;
    expect(next).toContain("previous paragraph");
    expect(next).toContain("It began.");
    expect(topicRequest({ ...topic, language: "cs" }).prompt).toContain("téma");
  });

  test("code lists the symbols", () => {
    expect(
      codeRequest({ language: "JavaScript", symbols: "(){}" }).prompt,
    ).toContain("( ) { }");
  });

  test("feedback sends statistics only", () => {
    const p = feedbackRequest({
      language: "en",
      wpm: 33.6,
      accuracy: 0.934,
      weakest: ["r", "p"],
    }).prompt;
    expect(p).toContain("34 wpm");
    expect(p).toContain("93 percent");
    expect(p).toContain("r, p");
  });
});

describe("modes", () => {
  test("lesson text is lowercased, validated and joined", async () => {
    const out = await lessonText(
      fake(["The hot sun ", "had set and the lion sat in the sand."]),
      lesson,
    );
    expect(out).toBeDefined();
  });

  test("lesson text is rejected when too few words fit the letters", async () => {
    expect(
      await lessonText(
        fake(["zebra quiz jumped over wax boxes today"]),
        lesson,
      ),
    ).toBeUndefined();
  });

  test("topic and feedback return cleaned text", async () => {
    expect(await topicText(fake([passage]), enUs, topic)).toBe(passage);
    expect(
      await feedbackSentence(
        fake(["Sure: ", "Slow down on r and p and keep your accuracy high."]),
        enUs,
        { language: "en", wpm: 30, accuracy: 0.9, weakest: [] },
      ),
    ).toBeDefined();
  });

  test("code takes the fenced block", async () => {
    const out = await codeText(
      fake(["```js\nfunction sum(a, b) {\n  return a + b;\n}\n```"]),
      enUs,
      { language: "JavaScript", symbols: "(){}" },
    );
    expect(out).toBe("function sum(a, b) {\n  return a + b;\n}");
  });

  test("a failing stream, mid-way or at once, gives undefined", async () => {
    const err = new ProviderError("network", "down");
    expect(await topicText(fake([passage], err), enUs, topic)).toBeUndefined();
    expect(await lessonText(fake([], err), lesson)).toBeUndefined();
  });

  test("an aborted wait gives undefined", async () => {
    const slow: TextProvider = {
      listModels: async () => [],
      async *stream(_, signal) {
        await new Promise((_, reject) =>
          signal?.addEventListener("abort", () => reject(new Error("aborted"))),
        );
        yield "never";
      },
    };
    expect(
      await topicText(slow, enUs, topic, AbortSignal.timeout(10)),
    ).toBeUndefined();
  });

  test("empty and malformed output gives undefined", async () => {
    expect(await topicText(fake([""]), enUs, topic)).toBeUndefined();
    expect(await topicText(fake(["too short"]), enUs, topic)).toBeUndefined();
    expect(
      await codeText(fake(["```\nlet é = 1\n```"]), enUs, {
        language: "JavaScript",
        symbols: "=",
      }),
    ).toBeUndefined();
  });
});
