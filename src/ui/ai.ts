import type { Targets } from "../core/adaptive/weakness";
import { weakness } from "../core/adaptive/weakness";
import type { Layout } from "../core/layouts/layout";
import { layoutById } from "../core/layouts/registry";
import type { Lesson } from "../core/lessons/lessons";
import { stageCount, unlockedLetters } from "../core/lessons/letters";
import { trackChars } from "../core/lessons/tracks";
import type { ModelServer } from "../core/settings/settings";
import type { CharStats } from "../core/stats/chars";

// AI.md: lesson text only pays off once most letters are known; code uses whole snippets from stage 4.
const LESSON_MIN_LETTERS = 12;
const CODE_SNIPPET_STAGE = 4;
// On-demand generation has no prefetch yet, so this is a visible wait at most.
const WAIT_MS = 8000;
const PREVIOUS_CHARS = 200;

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

// The last passage of the current topic, so the next one can build on it.
let last: { topic: string; text: string } | undefined;

export interface TextRequest {
  layout: Layout["id"];
  lesson: Lesson;
  letterStage: number;
  stats: CharStats;
  targets: Targets;
  words: number;
}

/** Model text for the lesson, or undefined for any reason at all: the caller then uses offline text. */
export async function generatedText(
  server: ModelServer,
  r: TextRequest,
): Promise<string | undefined> {
  const plan = planMode(server, r.layout, r.lesson, r.letterStage);
  if (plan === undefined) return undefined;
  try {
    const { provider, modes } = await load(server);
    const layout = layoutById(r.layout);
    const language = languageOf(r.layout);
    const signal = AbortSignal.timeout(WAIT_MS);
    if (plan === "code") {
      return await modes.codeText(
        provider,
        layout,
        { language: "JavaScript", symbols: trackChars("code", r.lesson.stage) },
        signal,
      );
    }
    if (plan === "topic") {
      const topic = server.topic.trim();
      const previous = last?.topic === topic ? last.text : undefined;
      const text = await modes.topicText(
        provider,
        layout,
        { language, topic, previous: previous?.slice(-PREVIOUS_CHARS) },
        signal,
      );
      if (text !== undefined) last = { topic, text };
      return text;
    }
    const letters = unlockedLetters(r.layout, r.letterStage) ?? "";
    const weak = [...letters]
      .map((c) => ({ c, w: weakness(r.stats[c], r.targets) }))
      .filter((x) => x.w > 0)
      .sort((a, b) => b.w - a.w)
      .slice(0, 5)
      .map((x) => x.c);
    return await modes.lessonText(
      provider,
      { language, letters, weak, words: Math.min(r.words, 40) },
      signal,
    );
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
