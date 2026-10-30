import { type Targets, weakness } from "../adaptive/weakness";
import type { CharStats } from "../stats/chars";
import type { Rng } from "./rng";

// Below this many distinct fitting words the vocabulary is too small to practise on (about stage 5 of en-us).
export const MIN_WORDS = 100;
const PSEUDO_MIN = 3;
const PSEUDO_SPAN = 3; // lengths 3 to 5
// Every word keeps this weight, so strong keys still appear; a fully weak letter makes its words up to 5x likelier.
const FLOOR = 0.25;
const RECENT = 8; // a word is not repeated within this many words
const REDRAWS = 10;

export interface GenerateOptions {
  words: readonly string[]; // frequency-ordered word list
  allowed: string; // letters the learner has unlocked; Space is always allowed
  stats?: CharStats; // per-character stats; weak characters are sampled more
  targets: Targets;
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
  need: (letter: string) => number,
): string {
  const len = PSEUDO_MIN + Math.floor(rng() * PSEUDO_SPAN);
  let out = pickWeighted(
    letters,
    (a) =>
      need(a) * letters.reduce((n, b) => n + 1 + (pairs.get(a + b) ?? 0), 0),
    rng,
  );
  while (out.length < len) {
    const prev = out.slice(-1);
    out += pickWeighted(
      letters,
      (b) => need(b) * (1 + (pairs.get(prev + b) ?? 0)),
      rng,
    );
  }
  return out;
}

export function generate({
  words,
  allowed,
  stats = {},
  targets,
  length,
  rng,
}: GenerateOptions): string {
  const letters = [...new Set(allowed)];
  if (letters.length === 0) return "";
  const set = new Set(letters);
  const fitting = words.filter((w) => [...w].every((c) => set.has(c)));
  const need = new Map(letters.map((l) => [l, weakness(stats[l], targets)]));
  const out: string[] = [];
  if (fitting.length >= MIN_WORDS) {
    const cumulative = new Float64Array(fitting.length);
    let total = 0;
    for (const [i, w] of fitting.entries()) {
      total += FLOOR + [...w].reduce((n, c) => n + (need.get(c) ?? 0), 0);
      cumulative[i] = total;
    }
    const draw = (): number => {
      const r = rng() * total;
      let lo = 0;
      let hi = cumulative.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if ((cumulative[mid] ?? 0) > r) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    };
    for (let i = 0; i < length; i++) {
      let word = fitting[draw()] ?? "";
      for (let t = 0; t < REDRAWS && out.slice(-RECENT).includes(word); t++)
        word = fitting[draw()] ?? "";
      out.push(word);
    }
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
    for (let i = 0; i < length; i++)
      out.push(
        pseudoWord(letters, rng, pairs, (l) => FLOOR + (need.get(l) ?? 0)),
      );
  }
  return out.join(" ");
}
