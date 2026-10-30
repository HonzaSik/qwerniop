<script lang="ts">
import type { Layout } from "../../core/layouts/layout";
import { createHighlighter, type KeyElement } from "./key-highlight";
import { keyLabel } from "./keyboard-labels";

interface Props {
  layout: Layout;
}

let { layout }: Props = $props();

let highlighter: ReturnType<typeof createHighlighter> | undefined;

/** The character to type next, or undefined when there is none. */
export function next(char: string | undefined): void {
  highlighter?.next(char);
}

export function keyDown(code: string): void {
  highlighter?.keyDown(code);
}

export function wrong(code: string): void {
  highlighter?.wrong(code);
}

// The key elements are looked up once: keystrokes only toggle classes on them.
function highlight(root: HTMLElement): { destroy: () => void } {
  const keys = new Map<string, KeyElement>();
  for (const el of root.querySelectorAll<HTMLElement>("[data-code]")) {
    keys.set(el.dataset.code ?? "", el);
  }
  const h = createHighlighter(layout, keys);
  highlighter = h;
  const controller = new AbortController();
  const { signal } = controller;
  document.addEventListener("keyup", (e) => h.release(e.code), { signal });
  // A keyup can be lost with focus, which would leave a key dark.
  window.addEventListener("blur", () => h.release(), { signal });
  return {
    destroy() {
      controller.abort();
      highlighter = undefined;
    },
  };
}

const ROWS = [0, 1, 2, 3, 4] as const;
// Pushes Space to where it sits on a physical ANSI board: Ctrl, Win and Alt at 1.25 units each.
const SPACE_ROW_OFFSET = 3.75;
</script>

<!-- Decorative: the practice text is the accessible surface. Keys are addressable by data-code. -->
<div class="keyboard" aria-hidden="true">
  <div class="board" use:highlight>
  {#each ROWS as row}
    <div class="row">
      {#if row === 4}
        <span class="gap" style:--w={SPACE_ROW_OFFSET}></span>
      {/if}
      {#each layout.keys.filter((k) => k.row === row) as key (key.code)}
        {@const label = keyLabel(key)}
        <span class="key" data-code={key.code} data-finger={key.finger} style:--w={key.width ?? 1}>
          {#if label.shift}<span class="shift">{label.shift}</span>{/if}
          <span>{label.main}</span>
        </span>
      {/each}
    </div>
  {/each}
  </div>
</div>

<style>
  .keyboard {
    /* Key sizes derive from the width, in key units of 1/15, so the board scales without scrolling. */
    container-type: inline-size;
    width: 100%;
    max-width: var(--keyboard-max-width);
  }

  .board {
    padding: var(--keyboard-gap);
    border-radius: var(--radius-group);
    background: var(--surface);
    color: var(--text);
    font-size: calc(100cqw / 15 * var(--keyboard-label-ratio));
    user-select: none;
  }

  .row {
    display: flex;
  }

  .row + .row {
    margin-top: var(--keyboard-gap);
  }

  .gap,
  .key {
    flex: none;
    box-sizing: border-box;
    width: calc(var(--w) * 100% / 15);
  }

  .key {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: calc(100cqw / 15 * var(--keyboard-key-ratio));
    /* Inset instead of margin, so widths still sum to a whole row. */
    border: calc(var(--keyboard-gap) / 2) solid var(--surface);
    border-radius: var(--radius-key);
    background: var(--finger-bg);
    background-clip: padding-box;
    line-height: 1.2;
    position: relative;
  }

  /* Overlays animate only opacity (DESIGN.md Motion). */
  .key::before,
  .key::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0;
    pointer-events: none;
  }

  .key::before {
    background: var(--text);
  }

  .key::after {
    background: var(--error);
  }

  .key:global(.pressed)::before {
    opacity: var(--key-press-opacity);
  }

  .key:global(.wrong)::after {
    opacity: var(--key-wrong-opacity);
  }

  .key:global(.next) {
    outline: var(--keyboard-next-ring) solid var(--accent);
    outline-offset: calc(-1 * var(--keyboard-next-ring));
  }

  @media (prefers-reduced-motion: no-preference) {
    .key::before,
    .key::after {
      transition: opacity var(--duration-press) var(--ease);
    }
  }

  .shift {
    color: var(--text-2);
  }

  .key[data-finger="L5"] { --finger-bg: var(--finger-l5); }
  .key[data-finger="L4"] { --finger-bg: var(--finger-l4); }
  .key[data-finger="L3"] { --finger-bg: var(--finger-l3); }
  .key[data-finger="L2"] { --finger-bg: var(--finger-l2); }
  .key[data-finger="R2"] { --finger-bg: var(--finger-r2); }
  .key[data-finger="R3"] { --finger-bg: var(--finger-r3); }
  .key[data-finger="R4"] { --finger-bg: var(--finger-r4); }
  .key[data-finger="R5"] { --finger-bg: var(--finger-r5); }
  .key[data-finger="T"] { --finger-bg: var(--finger-t); }
</style>
