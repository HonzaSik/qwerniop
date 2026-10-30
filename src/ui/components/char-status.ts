import type { Change, CharState } from "../../core/engine/engine";

const STATUS_CLASS: Record<CharState["status"], string> = {
  pending: "",
  correct: "typed",
  corrected: "typed",
  wrong: "wrong",
  // Skipped characters are spaces and tabs, which have no ink to colour.
  skipped: "",
};

/** The text of a character's span. */
export function charText(expected: string): string {
  // A lone line break paints nothing, so a wrong one could show no error.
  // The space gives it a cell, reserved from the start so an error shifts no layout.
  return expected === "\n" ? " \n" : expected;
}

export function paintChars(
  spans: ArrayLike<{ className: string }>,
  chars: readonly CharState[],
  indices: Iterable<number>,
): void {
  for (const index of indices) {
    const span = spans[index];
    // Read by index on every paint: Backspace replaces the object at a position.
    const char = chars[index];
    if (span !== undefined && char !== undefined) {
      span.className = STATUS_CLASS[char.status];
    }
  }
}

export interface CharStatusParams {
  chars: readonly CharState[];
  /** Receives the function that paints a `Change`. */
  connect: (paint: (change: Change) => void) => void;
}

/**
 * Hands out a painter rather than taking a `Change` as a reactive parameter: Svelte runs an
 * action's update later, so when one input event emits several characters only the last would paint.
 */
export function charStatus(
  container: HTMLElement,
  { chars, connect }: CharStatusParams,
): void {
  const spans = Array.from(container.children);
  // A session can be shown again part way through, after a view switch.
  paintChars(spans, chars, chars.keys());
  connect((change) => paintChars(spans, chars, change));
}
