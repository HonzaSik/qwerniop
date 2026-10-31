<script lang="ts">
import type { Change, Session } from "../../core/engine/engine";
import Caret from "./Caret.svelte";
import { charStatus, charText } from "./char-status";

interface Props {
  /** Keep it out of `$state`, or use `$state.raw`: a deep proxy would make every keystroke reactive. */
  session: Session;
}

let { session }: Props = $props();
let paint: ((change: Change) => void) | undefined;
let moveCaret: (() => void) | undefined;

export function update(change: Change): void {
  paint?.(change);
  moveCaret?.();
}

function connect(painter: (change: Change) => void): void {
  paint = painter;
}

function connectCaret(move: () => void): void {
  moveCaret = move;
}
</script>

<div class="view">
  {#key session}
    <!-- On one line: this element preserves white space, so template indentation would show. -->
    <div class="text" use:charStatus={{ chars: session.chars, connect }}>{#each session.chars as char}<span>{charText(char.expected)}</span>{/each}<Caret {session} connect={connectCaret} /></div>
  {/key}
</div>

<style>
  .view {
    max-width: var(--practice-column);
    /* Three lines, the number caret-motion.ts scrolls by. */
    height: 3lh;
    font-family: var(--font-practice);
    font-size: var(--text-size-practice);
    line-height: var(--line-height-practice);
    /* Vertical only: spaces hanging past the line end, and the caret on them, must stay visible. */
    overflow-y: clip;
  }

  .text {
    position: relative;
    color: var(--text-3);
    /* Ligatures would merge characters that carry separate statuses. */
    font-variant-ligatures: none;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  :global(:root:not([data-reduce-motion])) .text {
    transition: transform var(--duration-view) var(--ease);
  }

  /* Global because setting className removes the scope class Svelte puts on elements. */
  .text :global(.typed) {
    color: var(--text);
  }

  .text :global(.wrong) {
    background: var(--error-bg);
    color: var(--error);
    text-decoration: underline;
  }
</style>
