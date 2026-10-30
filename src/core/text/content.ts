import type { Targets } from "../adaptive/weakness";
import { trackChars } from "../lessons/tracks";
import type { CharStats } from "../stats/chars";
import { generate } from "./generate";
import type { Rng } from "./rng";

export type ContentType = "words" | "punctuation" | "numbers" | "code";

export interface ContentOptions {
  type: ContentType;
  words: readonly string[];
  snippets: readonly string[]; // from parseSnippets
  letters: string; // unlocked letters; code ignores it, see codeText
  stats?: CharStats; // weights words and punctuation text; numbers and code ignore it
  targets: Targets;
  stage: number; // stage within the track of `type`
  length: number; // words (groups for numbers, lines for code stages 1 to 3)
  rng: Rng;
}

const SENTENCE_MIN = 3;
const SENTENCE_SPAN = 5; // 3 to 7 words
const MARK_CHANCE = 0.1;
const CODE_LINE_MIN = 4;
const CODE_WORDS_PER_LINE = 5;

/** Snippet files separate snippets with a blank line. */
export function parseSnippets(raw: string): string[] {
  return raw
    .split(/\n\s*\n/)
    .map((s) => s.replace(/\s+$/, "").replace(/^\n+/, ""))
    .filter(Boolean);
}

const pick = (items: readonly string[], rng: Rng): string =>
  items[Math.floor(rng() * items.length)] ?? "";

// Capitals and punctuation are injected into word text: sentences of 3 to 7 words, then each
// mark the stage has unlocked is applied with a small chance so words still dominate.
function punctuated(o: ContentOptions): string {
  const marks = trackChars("punctuation", o.stage);
  const has = (c: string) => marks.includes(c);
  const words = generate({ ...o, allowed: o.letters }).split(" ");
  const pairs = ["()", "[]", "{}"].filter((p) => has(p.charAt(0)));
  const ends = [".", "?", "!"].filter(has);
  let out = "";
  let left = 0;
  let sentenceStart = true;
  for (const [i, raw] of words.entries()) {
    let w = raw;
    if (sentenceStart && o.stage >= 1) {
      w = w.charAt(0).toUpperCase() + w.slice(1);
    }
    if (left === 0) left = SENTENCE_MIN + Math.floor(o.rng() * SENTENCE_SPAN);
    const chance = () => o.rng() < MARK_CHANCE;
    if (has('"') && chance()) w = `"${w}"`;
    else if (pairs.length > 0 && chance()) {
      const p = pick(pairs, o.rng);
      w = p.charAt(0) + w + p.charAt(1);
    } else if (has("'") && o.letters.includes("s") && chance()) w += "'s";
    left--;
    sentenceStart = false;
    let sep = " ";
    if (i === words.length - 1) sep = ends.includes(".") ? "." : "";
    else if (left === 0) {
      sentenceStart = true;
      sep = `${ends.length > 0 ? pick(ends, o.rng) : ""} `;
    } else if (has(",") && o.rng() < 0.2) sep = ", ";
    else if (has("-") && chance()) sep = "-";
    else if (has(":") && chance()) sep = pick([": ", "; "], o.rng);
    out += w + sep;
  }
  return out.trimEnd();
}

function numberText(o: ContentOptions): string {
  const digits = trackChars("numbers", o.stage);
  const groups: string[] = [];
  for (let i = 0; i < o.length; i++) {
    const n = 1 + Math.floor(o.rng() * 4);
    groups.push(
      Array.from({ length: n }, () => pick([...digits], o.rng)).join(""),
    );
  }
  return groups.join(" ");
}

// Code uses the whole alphabet: identifiers need letters the letter track has not reached yet.
// Symbols follow the stage; stages 1 to 3 type single lines, stage 4 whole snippets with Enter.
function codeText(o: ContentOptions): string {
  const ok = new Set(
    `${trackChars("code", o.stage)}abcdefghijklmnopqrstuvwxyz \n`,
  );
  const fits = (s: string) => [...s].every((c) => ok.has(c));
  if (o.stage >= 4) {
    const pool = o.snippets.filter(fits);
    if (pool.length === 0) return "";
    const out: string[] = [];
    let count = 0;
    while (count < o.length) {
      const s = pick(pool, o.rng);
      out.push(s);
      count += s.split(/\s+/).length;
    }
    return out.join("\n");
  }
  const lines = [
    ...new Set(
      o.snippets
        .flatMap((s) => s.split("\n"))
        .map((l) => l.trim())
        .filter((l) => l.length >= CODE_LINE_MIN && fits(l)),
    ),
  ];
  if (lines.length === 0) return "";
  const n = Math.max(1, Math.round(o.length / CODE_WORDS_PER_LINE));
  return Array.from({ length: n }, () => pick(lines, o.rng)).join(" ");
}

export function generateContent(o: ContentOptions): string {
  switch (o.type) {
    case "words":
      return generate({ ...o, allowed: o.letters });
    case "punctuation":
      return punctuated(o);
    case "numbers":
      return numberText(o);
    case "code":
      return codeText(o);
  }
}
