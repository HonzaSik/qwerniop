import type { Layout } from "../core/layouts/layout";
import { producible, typable } from "../core/text/typable";

// `min` and `max` count characters of the cleaned result.
export type ValidateOptions =
  | { kind: "lesson"; allowed: string; min: number; max: number }
  | {
      kind: "topic" | "feedback" | "code";
      layout: Layout;
      min: number;
      max: number;
    };

const LESSON_SURVIVAL = 0.6;
const TAB = "    ";

const FENCE = /^\s*```/;
const QUOTES = /^["'`]+|["'`]+$/g;
const LIST_MARKER = /^(?:(?:#{1,6}|[-•]|\d+[.)])\s+)+/;

/** Text of the first fenced block, or the input when the model did not fence. */
function unfence(text: string): string {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => FENCE.test(l));
  if (start < 0) return text;
  const end = lines.findIndex((l, i) => i > start && FENCE.test(l));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n");
}

function plain(text: string): string {
  const lines = text
    .split("\n")
    .filter((l) => !FENCE.test(l))
    .map((l) => l.trim());
  // A first line ending in ":" is the model introducing its answer.
  const body =
    lines.length > 1 && lines[0]?.endsWith(":") ? lines.slice(1) : lines;
  return body
    .map((l) =>
      l
        .replace(/[*`]/g, "")
        .trim()
        .replace(LIST_MARKER, "")
        .replace(QUOTES, "")
        .trim(),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function code(text: string): string {
  return unfence(text)
    .split("\n")
    .map((l) => l.replace(/\t/g, TAB).trimEnd())
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}

function convert(layout: Layout, word: string): string | undefined {
  let out = "";
  for (const ch of word) {
    const t = producible(layout, ch);
    if (t === undefined) return undefined;
    out += t;
  }
  return out;
}

function clamp(
  text: string,
  min: number,
  max: number,
  boundary: string,
): string | undefined {
  let out = text;
  if (out.length > max) {
    const cut = out.slice(0, max + 1);
    const at = cut.lastIndexOf(boundary);
    out = at > 0 ? cut.slice(0, at) : "";
  }
  return out.length >= min && out.length > 0 ? out : undefined;
}

/** Cleaned text, or undefined when the caller should use offline content. */
export function validate(
  raw: string,
  options: ValidateOptions,
): string | undefined {
  const text = typable(raw);
  if (options.kind === "code") {
    const snippet = code(text);
    return convert(options.layout, snippet) === snippet
      ? clamp(snippet, options.min, options.max, "\n")
      : undefined;
  }
  const words = plain(text).split(" ").filter(Boolean);
  let kept: string[];
  if (options.kind === "lesson") {
    const allowed = new Set(options.allowed);
    kept = words.filter((w) => [...w].every((c) => allowed.has(c)));
    if (kept.length < words.length * LESSON_SURVIVAL) return undefined;
  } else {
    const { layout } = options;
    kept = words.flatMap((w) => convert(layout, w) ?? []);
  }
  return clamp(kept.join(" "), options.min, options.max, " ");
}
