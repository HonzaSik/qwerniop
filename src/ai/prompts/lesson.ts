import type { GenerateRequest } from "../provider";

export type Language = "en" | "cs";

export interface LessonInput {
  language: Language;
  /** Letters the sentences may use. */
  letters: string;
  /** Weakest letters first, at most five. */
  weak: readonly string[];
  words: number;
}

const SYSTEM: Record<Language, string> = {
  en: "You write typing practice material. Reply with plain text only: no Markdown, no lists, no quotes around the answer, no introduction.",
  cs: "Píšeš materiál pro nácvik psaní na klávesnici. Odpovídej pouze prostým textem: žádný Markdown, žádné seznamy, žádné uvozovky kolem odpovědi, žádný úvod.",
};

export function lessonRequest(input: LessonInput): GenerateRequest {
  const letters = [...input.letters].join(" ");
  const weak = input.weak.join(" ");
  const prompt =
    input.language === "cs"
      ? `Napiš asi ${input.words} slov přirozených českých vět pouze z písmen ${letters} a mezer.${weak ? ` Často použij písmena ${weak}.` : ""} Příklad: tato kočka sedí na okně a kouká na lidi.`
      : `Write about ${input.words} words of natural English sentences using only the letters ${letters} and spaces.${weak ? ` Use the letters ${weak} often.` : ""} Example: the hot sun had set and the lion sat in the sand.`;
  return {
    system: SYSTEM[input.language],
    prompt,
    maxTokens: input.words * 6 + 60,
    temperature: 0.8,
  };
}
