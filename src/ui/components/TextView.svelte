<script lang="ts">
import type { Change, Session } from "../../core/engine/engine";
import { charStatus, charText } from "./char-status";

interface Props {
  /** Keep it out of `$state`, or use `$state.raw`: a deep proxy would make every keystroke reactive. */
  session: Session;
}

let { session }: Props = $props();
let paint: ((change: Change) => void) | undefined;

export function update(change: Change): void {
  paint?.(change);
}

function connect(painter: (change: Change) => void): void {
  paint = painter;
}
</script>

{#key session}
  <!-- On one line: this element preserves white space, so template indentation would show. -->
  <div class="text" use:charStatus={{ chars: session.chars, connect }}>{#each session.chars as char}<span>{charText(char.expected)}</span>{/each}</div>
{/key}

<style>
  .text {
    max-width: var(--practice-column);
    color: var(--text-3);
    font-family: var(--font-practice);
    font-size: var(--text-size-practice);
    /* Ligatures would merge characters that carry separate statuses. */
    font-variant-ligatures: none;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
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
