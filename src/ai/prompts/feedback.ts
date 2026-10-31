import type { SessionRecord } from "../../core/engine/record";
import type { Finger, Layout } from "../../core/layouts/layout";
import { fingerFor } from "../../core/layouts/strokes";
import type { GenerateRequest } from "../provider";
import type { Language } from "./lesson";

/** Earlier sessions averaged for the trend: enough to smooth one bad day, few enough to be recent. */
export const TREND_SESSIONS = 5;

export interface FeedbackInput {
  language: Language;
  wpm: number;
  /** 0 to 1 */
  accuracy: number;
  /** Key labels, weakest first. */
  weakest: readonly string[];
  /** Finger of each weak key, without repeats. */
  fingers: readonly Finger[];
  /** Averages over the sessions before this one; absent for a first session. */
  trend?: { sessions: number; wpm: number; accuracy: number } | undefined;
}

const SYSTEM: Record<Language, string> = {
  en: "You write typing practice material. Reply with plain text only: no Markdown, no lists, no quotes around the answer, no introduction.",
  cs: "Píšeš materiál pro nácvik psaní na klávesnici. Odpovídej pouze prostým textem: žádný Markdown, žádné seznamy, žádné uvozovky kolem odpovědi, žádný úvod.",
};

const FINGER: Record<Language, Record<Finger, string>> = {
  en: {
    L5: "left pinky",
    L4: "left ring",
    L3: "left middle",
    L2: "left index",
    R2: "right index",
    R3: "right middle",
    R4: "right ring",
    R5: "right pinky",
    T: "thumb",
  },
  cs: {
    L5: "levý malíček",
    L4: "levý prsteník",
    L3: "levý prostředník",
    L2: "levý ukazováček",
    R2: "pravý ukazováček",
    R3: "pravý prostředník",
    R4: "pravý prsteník",
    R5: "pravý malíček",
    T: "palec",
  },
};

/** Statistics only: key labels, fingers and numbers, never typed text. */
export function feedbackInput(
  layout: Layout,
  language: Language,
  current: { wpm: number; accuracy: number },
  weakest: { codes: readonly string[]; labels: readonly string[] },
  history: readonly SessionRecord[],
): FeedbackInput {
  const fingers = [
    ...new Set(weakest.codes.flatMap((c) => fingerFor(layout, c) ?? [])),
  ];
  const before = history
    .filter((r) => r.layout === layout.id)
    .sort((a, b) => a.at - b.at)
    .slice(-TREND_SESSIONS);
  const mean = (f: (r: SessionRecord) => number): number =>
    before.reduce((n, r) => n + f(r), 0) / before.length;
  return {
    language,
    ...current,
    weakest: weakest.labels,
    fingers,
    trend:
      before.length === 0
        ? undefined
        : {
            sessions: before.length,
            wpm: mean((r) => r.wpm),
            accuracy: mean((r) => r.accuracy),
          },
  };
}

export function feedbackRequest(input: FeedbackInput): GenerateRequest {
  const wpm = Math.round(input.wpm);
  const accuracy = Math.round(input.accuracy * 100);
  const keys = input.weakest.join(", ");
  const names = FINGER[input.language];
  const fingers = input.fingers.map((f) => names[f]).join(", ");
  const { trend } = input;
  const trendWpm = trend ? Math.round(trend.wpm) : 0;
  const trendAccuracy = trend ? Math.round(trend.accuracy * 100) : 0;
  const prompt =
    input.language === "cs"
      ? `Dej dvě nebo tři jednoduché věty s radou k psaní. Statistiky: ${wpm} slov za minutu, přesnost ${accuracy} procent${keys ? `, nejslabší klávesy ${keys}` : ""}${fingers ? `, nejslabší prsty ${fingers}` : ""}.${trend ? ` Předchozích ${trend.sessions} lekcí mělo průměr ${trendWpm} slov za minutu a přesnost ${trendAccuracy} procent.` : ""} Příklad: Nejslabší klávesy byly r a p, obě na levém ukazováčku. Zpomal na nich a drž přesnost nad 95 procenty.`
      : `Give two or three plain sentences of typing advice. Statistics: ${wpm} wpm, accuracy ${accuracy} percent${keys ? `, weakest keys ${keys}` : ""}${fingers ? `, weakest fingers ${fingers}` : ""}.${trend ? ` The previous ${trend.sessions} sessions averaged ${trendWpm} wpm and ${trendAccuracy} percent accuracy.` : ""} Example: Your weakest keys were r and p, both on your left index finger. Slow down on them and keep your accuracy above 95 percent.`;
  return {
    system: SYSTEM[input.language],
    prompt,
    maxTokens: 160,
    temperature: 0.7,
  };
}
