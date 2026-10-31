import type { Layout } from "../layouts/layout";
import { strokesFor } from "../layouts/strokes";
import type { CharStats } from "../stats/chars";
import { type Targets, weakness } from "./weakness";

/** Up to n distinct physical keys (codes) behind this session's weakest typed characters, weakest first. */
export function weakestKeys(
  layout: Layout,
  stats: CharStats,
  chars: Iterable<string>,
  targets: Targets,
  n: number,
): string[] {
  const ranked = [...new Set(chars)]
    .filter((c) => c.trim() !== "")
    .map((c) => ({ c, w: weakness(stats[c], targets) }))
    .filter((x) => x.w > 0)
    .sort((a, b) => b.w - a.w); // stable: ties keep first-seen order
  const codes = new Set<string>();
  for (const { c } of ranked) {
    // The last stroke is the main key; a dead key comes first, Shift is separate.
    const code = strokesFor(layout, c)?.at(-1)?.code;
    if (code !== undefined) codes.add(code);
  }
  return [...codes].slice(0, n);
}

export interface FeedbackInput {
  wpm: number;
  accuracy: number; // 0 to 1
  targets: Targets;
  /** Display labels of the weakest keys, weakest first. */
  weakest: readonly string[];
  /** Title of a lesson this session unlocked. */
  unlocked?: string | undefined;
}

/** What to tell the learner; the UI words it per language. */
export type Feedback =
  | { rule: "unlocked"; title: string }
  | { rule: "accuracy" | "speed" | "met"; keys: readonly string[] };

/** One message about the session; the first rule that applies wins. */
export function feedbackRule(input: FeedbackInput): Feedback {
  const { wpm, accuracy, targets, weakest, unlocked } = input;
  if (unlocked) return { rule: "unlocked", title: unlocked };
  if (accuracy < targets.accuracy) return { rule: "accuracy", keys: weakest };
  if (wpm < targets.wpm) return { rule: "speed", keys: weakest };
  return { rule: "met", keys: weakest };
}
