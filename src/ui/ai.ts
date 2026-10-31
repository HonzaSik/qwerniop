import type { Targets } from "../core/adaptive/weakness";
import { weakness } from "../core/adaptive/weakness";
import type { Layout } from "../core/layouts/layout";
import { layoutById } from "../core/layouts/registry";
import type { Lesson } from "../core/lessons/lessons";
import { stageCount, unlockedLetters } from "../core/lessons/letters";
import { trackChars } from "../core/lessons/tracks";
import type { ModelServer } from "../core/settings/settings";
import type { CharStats } from "../core/stats/chars";
import { generate } from "../core/text/generate";
import { seededRng } from "../core/text/rng";
import {
  addPassage,
  emptyTopic,
  recapDue,
  type TopicHistory,
} from "../core/topics/history";

// AI.md: lesson text only pays off once most letters are known; code uses whole snippets from stage 4.
const LESSON_MIN_LETTERS = 12;
const CODE_SNIPPET_STAGE = 4;
const PREVIOUS_CHARS = 200;
// A recap covers the passages since the last one.
const RECAP_PASSAGES = 3;

export type Plan = "topic" | "lesson" | "code";

/** Which model mode, if any, replaces the offline text of this lesson. Topic wins once every letter is known. */
export function planMode(
  server: ModelServer,
  layout: Layout["id"],
  lesson: Lesson,
  letterStage: number,
): Plan | undefined {
  if (!server.enabled || server.model === "") return undefined;
  if (lesson.track === "code") {
    return server.modes.code && lesson.stage >= CODE_SNIPPET_STAGE
      ? "code"
      : undefined;
  }
  if (lesson.track !== "letters") return undefined;
  if (
    server.modes.topic &&
    server.topic.trim() !== "" &&
    letterStage >= stageCount(layout)
  ) {
    return "topic";
  }
  const letters = unlockedLetters(layout, letterStage) ?? "";
  return server.modes.lesson && letters.length >= LESSON_MIN_LETTERS
    ? "lesson"
    : undefined;
}

const languageOf = (id: Layout["id"]): "en" | "cs" =>
  id === "cs-qwertz" ? "cs" : "en";

// The ai chunk loads here and nowhere else, and only for a configured server.
async function load(server: ModelServer) {
  const [{ createOpenAiProvider }, modes] = await Promise.all([
    import("../ai/openai-compatible"),
    import("../ai/modes"),
  ]);
  const provider = createOpenAiProvider({
    baseUrl: server.baseUrl.trim(),
    model: server.model,
    apiKey: server.apiKey,
  });
  return { provider, modes };
}

export interface TopicStore {
  load(topic: string): Promise<TopicHistory | undefined>;
  save(topic: string, history: TopicHistory): void;
}

// Read from storage once per topic; later passages extend this copy.
const histories = new Map<string, TopicHistory>();
/** A recap owed after typing the passage it travels with, so a prefetched passage cannot trigger it early. */
export interface Recap {
  topic: string;
  passages: readonly string[];
}

export interface Generated {
  text: string;
  recap?: Recap;
}

export interface TextRequest {
  layout: Layout["id"];
  lesson: Lesson;
  letterStage: number;
  stats: CharStats;
  targets: Targets;
  words: number;
  /** Frequency-ordered list the offline top-up draws from. */
  wordList: readonly string[];
}

/** Identifies what a generated text is for; a result is only used under the key it was requested with. */
export function textKey(
  server: ModelServer,
  r: TextRequest,
): string | undefined {
  const plan = planMode(server, r.layout, r.lesson, r.letterStage);
  if (plan === undefined) return undefined;
  return JSON.stringify([
    plan,
    server.baseUrl,
    server.model,
    r.layout,
    r.lesson,
    r.letterStage,
    plan === "topic" ? server.topic.trim() : "",
    plan === "lesson" ? r.words : 0,
  ]);
}

/** Model text for the lesson, or undefined for any reason at all: the caller then uses offline text. */
export async function generatedText(
  server: ModelServer,
  r: TextRequest,
  signal: AbortSignal,
  topics?: TopicStore,
): Promise<Generated | undefined> {
  const plan = planMode(server, r.layout, r.lesson, r.letterStage);
  if (plan === undefined) return undefined;
  try {
    const { provider, modes } = await load(server);
    const layout = layoutById(r.layout);
    const language = languageOf(r.layout);
    if (plan === "code") {
      const text = await modes.codeText(
        provider,
        layout,
        { language: "JavaScript", symbols: trackChars("code", r.lesson.stage) },
        signal,
      );
      return text === undefined ? undefined : { text };
    }
    if (plan === "topic") {
      const topic = server.topic.trim();
      let history = histories.get(topic);
      if (history === undefined) {
        history =
          (await topics?.load(topic).catch(() => undefined)) ?? emptyTopic();
        histories.set(topic, history);
      }
      const previous = history.passages.at(-1);
      const text = await modes.topicText(
        provider,
        layout,
        { language, topic, previous: previous?.slice(-PREVIOUS_CHARS) },
        signal,
      );
      if (text === undefined) return undefined;
      history = addPassage(history, text);
      histories.set(topic, history);
      topics?.save(topic, history);
      return recapDue(history)
        ? {
            text,
            recap: { topic, passages: history.passages.slice(-RECAP_PASSAGES) },
          }
        : { text };
    }
    const letters = unlockedLetters(r.layout, r.letterStage) ?? "";
    const weak = [...letters]
      .map((c) => ({ c, w: weakness(r.stats[c], r.targets) }))
      .filter((x) => x.w > 0)
      .sort((a, b) => b.w - a.w)
      .slice(0, 5)
      .map((x) => x.c);
    const text = await modes.lessonText(
      provider,
      { language, letters, weak, words: r.words },
      signal,
      (n) =>
        generate({
          words: r.wordList,
          allowed: letters,
          stats: r.stats,
          targets: r.targets,
          length: n,
          rng: seededRng(Date.now()),
        }),
    );
    return text === undefined ? undefined : { text };
  } catch {
    return undefined;
  }
}

export interface FeedbackRequest {
  layout: Layout["id"];
  wpm: number;
  accuracy: number;
  weakest: string[];
}

/** A model-written sentence for the summary, or undefined to keep the offline one. */
export async function generatedFeedback(
  server: ModelServer,
  r: FeedbackRequest,
): Promise<string | undefined> {
  if (!server.enabled || server.model === "" || !server.modes.feedback) {
    return undefined;
  }
  try {
    const { provider, modes } = await load(server);
    return await modes.feedbackSentence(provider, layoutById(r.layout), {
      language: languageOf(r.layout),
      wpm: r.wpm,
      accuracy: r.accuracy,
      weakest: r.weakest,
    });
  } catch {
    return undefined;
  }
}

/** The recap question owed after the passage just typed, or undefined: not due, or any failure. */
export async function generatedRecap(
  server: ModelServer,
  layoutId: Layout["id"],
  due: Recap | undefined,
): Promise<string | undefined> {
  if (due === undefined || !server.enabled || server.model === "") {
    return undefined;
  }
  try {
    const { provider, modes } = await load(server);
    return await modes.recapQuestion(provider, layoutById(layoutId), {
      language: languageOf(layoutId),
      ...due,
    });
  } catch {
    return undefined;
  }
}
