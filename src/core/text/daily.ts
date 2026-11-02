import type { Layout } from "../layouts/layout";
import { generate } from "./generate";
import { seededRng } from "./rng";

const WORDS = 30;
// Only feed generate: with no stats they weigh every letter alike, whatever the learner has set.
const TARGETS = { accuracy: 0.95, wpm: 35 };

// FNV-1a: the seed must be the same on every device, so it comes from the date and layout alone.
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
}

/** The day's text. It takes nothing about the learner, so friends type the same words and can compare. */
export function dailyText(
  date: string,
  layout: Layout["id"],
  words: readonly string[],
): string {
  return generate({
    words,
    allowed: [...new Set(words.join(""))].join(""),
    targets: TARGETS,
    length: WORDS,
    rng: seededRng(hash(`${date}|${layout}`)),
  });
}
