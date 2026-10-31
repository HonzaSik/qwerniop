import type { Layout } from "../layouts/layout";

export type Track = "punctuation" | "numbers" | "code";

// LAYOUTS.md, "Other tracks": they open once the letter track reaches this step.
const START_STEP: Partial<Record<Layout["id"], number>> = {
  "en-us": 8,
  "cs-qwertz": 10,
};

// Characters each stage adds. Punctuation stage 1 adds only capitals, which need no new symbol.
const ADDS: Record<Track, readonly string[]> = {
  punctuation: ["", ".,", "?!'\":;-", "()[]{}"],
  numbers: ["12345", "67890"],
  // Code stage 4 adds Enter, handled by the generator, not a symbol.
  code: ["()[]{}", "=+-*/<>", "_&|!?:;'\"", ""],
};

/** The letter step at which the other tracks open; undefined for a layout without a letter order. */
export const tracksStart = (id: Layout["id"]): number | undefined =>
  START_STEP[id];

export function tracksOpen(id: Layout["id"], letterStage: number): boolean {
  const start = START_STEP[id];
  return start !== undefined && letterStage >= start;
}

export function trackStages(track: Track): number {
  return ADDS[track].length;
}

/** Symbols typable at a track stage (stage 1 is the first); a stage past the end unlocks all. */
export function trackChars(track: Track, stage: number): string {
  return ADDS[track].slice(0, Math.max(stage, 0)).join("");
}
