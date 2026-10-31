import type { GenerateRequest } from "../provider";
import type { Language } from "./lesson";

export interface FeedbackInput {
  language: Language;
  wpm: number;
  /** 0 to 1 */
  accuracy: number;
  /** Key labels, weakest first. */
  weakest: readonly string[];
}

const SYSTEM: Record<Language, string> = {
  en: "You write typing practice material. Reply with plain text only: no Markdown, no lists, no quotes around the answer, no introduction.",
  cs: "Píšeš materiál pro nácvik psaní na klávesnici. Odpovídej pouze prostým textem: žádný Markdown, žádné seznamy, žádné uvozovky kolem odpovědi, žádný úvod.",
};

export function feedbackRequest(input: FeedbackInput): GenerateRequest {
  const wpm = Math.round(input.wpm);
  const accuracy = Math.round(input.accuracy * 100);
  const keys = input.weakest.join(", ");
  const prompt =
    input.language === "cs"
      ? `Dej dvě nebo tři jednoduché věty s radou k psaní. Statistiky: ${wpm} slov za minutu, přesnost ${accuracy} procent${keys ? `, nejslabší klávesy ${keys}` : ""}. Příklad: Nejslabší klávesy byly r a p. Zpomal na nich a drž přesnost nad 95 procenty.`
      : `Give two or three plain sentences of typing advice. Statistics: ${wpm} wpm, accuracy ${accuracy} percent${keys ? `, weakest keys ${keys}` : ""}. Example: Your weakest keys were r and p. Slow down on them and keep your accuracy above 95 percent.`;
  return {
    system: SYSTEM[input.language],
    prompt,
    maxTokens: 160,
    temperature: 0.7,
  };
}
