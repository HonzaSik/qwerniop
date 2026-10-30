import type { Rng } from "./rng";

// Below this many distinct fitting words the vocabulary is too small to practise on (about stage 5 of en-us).
export const MIN_WORDS = 100;
const PSEUDO_MIN = 3;
const PSEUDO_SPAN = 3; // lengths 3 to 5

export interface GenerateOptions {
  words: readonly string[]; // frequency-ordered word list
  allowed: string; // letters the learner has unlocked; Space is always allowed
  length: number; // words in the passage
  rng: Rng;
}

function pickWeighted(
  letters: readonly string[],
  weight: (letter: string) => number,
  rng: Rng,
): string {
  let r = rng() * letters.reduce((n, l) => n + weight(l), 0);
  for (const l of letters) {
    r -= weight(l);
    if (r < 0) return l;
  }
  return letters.at(-1) ?? "";
}

// Letter pairs of the language, counted over the whole list. Add-one smoothing keeps every
// allowed pair possible, so "fj" alone still yields words.
function pseudoWord(
  letters: readonly string[],
  rng: Rng,
  pairs: Map<string, number>,
): string {
  const len = PSEUDO_MIN + Math.floor(rng() * PSEUDO_SPAN);
  let out = pickWeighted(
    letters,
    (a) => letters.reduce((n, b) => n + 1 + (pairs.get(a + b) ?? 0), 0),
    rng,
  );
  while (out.length < len) {
    const prev = out.slice(-1);
    out += pickWeighted(letters, (b) => 1 + (pairs.get(prev + b) ?? 0), rng);
  }
  return out;
}

export function generate({
  words,
  allowed,
  length,
  rng,
}: GenerateOptions): string {
  const letters = [...new Set(allowed)];
  if (letters.length === 0) return "";
  const set = new Set(letters);
  const fitting = words.filter((w) => [...w].every((c) => set.has(c)));
  const out: string[] = [];
  if (fitting.length >= MIN_WORDS) {
    for (let i = 0; i < length; i++)
      out.push(fitting[Math.floor(rng() * fitting.length)] ?? "");
  } else {
    const pairs = new Map<string, number>();
    for (const w of words) {
      for (let i = 1; i < w.length; i++) {
        const p = w.slice(i - 1, i + 1);
        if (set.has(p.charAt(0)) && set.has(p.charAt(1))) {
          pairs.set(p, (pairs.get(p) ?? 0) + 1);
        }
      }
    }
    for (let i = 0; i < length; i++) out.push(pseudoWord(letters, rng, pairs));
  }
  return out.join(" ");
}
