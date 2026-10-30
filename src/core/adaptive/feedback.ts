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

function list(keys: readonly string[]): string {
  const last = keys.at(-1) ?? "";
  return keys.length < 2 ? last : `${keys.slice(0, -1).join(", ")} and ${last}`;
}

/** One plain sentence about the session; the first rule that applies wins. */
export function feedbackSentence(input: FeedbackInput): string {
  const { wpm, accuracy, targets, weakest, unlocked } = input;
  const keys = weakest.length > 0;
  if (unlocked) return `${unlocked} is unlocked.`;
  if (accuracy < targets.accuracy) {
    return keys
      ? `Slow down and aim for accuracy, especially on ${list(weakest)}.`
      : "Slow down and aim for accuracy.";
  }
  if (wpm < targets.wpm) {
    return keys
      ? `Accuracy is on target. Keep a steady rhythm to build speed on ${list(weakest)}.`
      : "Accuracy is on target. Keep a steady rhythm to build speed.";
  }
  if (keys) {
    return `Both targets met. ${list(weakest)} still ${weakest.length === 1 ? "needs" : "need"} practice.`;
  }
  return "Both targets met.";
}
