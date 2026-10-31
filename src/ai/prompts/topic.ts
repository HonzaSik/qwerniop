import type { GenerateRequest } from "../provider";
import type { Language } from "./lesson";

export interface TopicInput {
  language: Language;
  topic: string;
  /** Tail of the previous passage, so the next one builds on it. */
  previous?: string | undefined;
}

const SYSTEM: Record<Language, string> = {
  en: "You write typing practice material. Reply with plain text only: no Markdown, no lists, no quotes around the answer, no introduction.",
  cs: "Píšeš materiál pro nácvik psaní na klávesnici. Odpovídej pouze prostým textem: žádný Markdown, žádné seznamy, žádné uvozovky kolem odpovědi, žádný úvod.",
};

export function topicRequest(input: TopicInput): GenerateRequest {
  const { topic, previous } = input;
  const prompt =
    input.language === "cs"
      ? `Napiš výukový odstavec o 40 až 80 slovech na téma: ${topic}. Používej obyčejné věty s běžnou interpunkcí.${previous ? ` Naváž na předchozí odstavec, neopakuj ho: ${previous}` : ""} Příklad: Vakcína ukáže tělu neškodnou část viru. Imunitní systém se ji naučí rozpoznat.`
      : `Write a teaching paragraph of 40 to 80 words about: ${topic}. Use plain sentences with ordinary punctuation.${previous ? ` Build on the previous paragraph without repeating it: ${previous}` : ""} Example: A vaccine shows the body a harmless piece of a virus. The immune system learns to recognise it.`;
  return {
    system: SYSTEM[input.language],
    prompt,
    maxTokens: 400,
    temperature: 0.7,
  };
}
