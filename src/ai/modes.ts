import type { Layout } from "../core/layouts/layout";
import { type CodeInput, codeRequest } from "./prompts/code";
import { type FeedbackInput, feedbackRequest } from "./prompts/feedback";
import { type LessonInput, lessonRequest } from "./prompts/lesson";
import {
  type RecapInput,
  recapRequest,
  type TopicInput,
  topicRequest,
} from "./prompts/topic";
import type { GenerateRequest, TextProvider } from "./provider";
import { validate } from "./validate";

// Every failure is the same to the caller: use offline content. A stopped server must never reach the learner.
async function collect(
  provider: TextProvider,
  request: GenerateRequest,
  signal?: AbortSignal,
): Promise<string | undefined> {
  try {
    let raw = "";
    for await (const chunk of provider.stream(request, signal)) raw += chunk;
    return raw;
  } catch {
    return undefined;
  }
}

// Models ignore "lowercase" less often than they ignore letter limits, and a capital would drop its word.
export async function lessonText(
  provider: TextProvider,
  input: LessonInput,
  signal?: AbortSignal,
  /** Offline words for the part of the session the model text does not cover. */
  fill?: (words: number) => string,
): Promise<string | undefined> {
  const raw = await collect(provider, lessonRequest(input), signal);
  if (raw === undefined) return undefined;
  const text = validate(raw.toLowerCase(), {
    kind: "lesson",
    allowed: input.letters,
    min: 20,
    max: input.words * 10,
  });
  if (text === undefined) return undefined;
  const words = text.split(" ").slice(0, input.words);
  const missing = input.words - words.length;
  return missing > 0 && fill
    ? [...words, fill(missing)].join(" ")
    : words.join(" ");
}

export async function topicText(
  provider: TextProvider,
  layout: Layout,
  input: TopicInput,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const raw = await collect(provider, topicRequest(input), signal);
  return raw === undefined
    ? undefined
    : validate(raw, { kind: "topic", layout, min: 150, max: 600 });
}

export async function codeText(
  provider: TextProvider,
  layout: Layout,
  input: CodeInput,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const raw = await collect(provider, codeRequest(input), signal);
  return raw === undefined
    ? undefined
    : validate(raw, { kind: "code", layout, min: 20, max: 600 });
}

export async function feedbackSentence(
  provider: TextProvider,
  layout: Layout,
  input: FeedbackInput,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const raw = await collect(provider, feedbackRequest(input), signal);
  return raw === undefined
    ? undefined
    : validate(raw, { kind: "feedback", layout, min: 20, max: 400 });
}

export async function recapQuestion(
  provider: TextProvider,
  layout: Layout,
  input: RecapInput,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const raw = await collect(provider, recapRequest(input), signal);
  return raw === undefined
    ? undefined
    : validate(raw, { kind: "topic", layout, min: 15, max: 250 });
}
