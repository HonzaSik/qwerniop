<script lang="ts">
import type { Layout } from "../../core/layouts/layout";
import { keyLabel } from "./keyboard-labels";

interface Props {
  layout: Layout;
}

let { layout }: Props = $props();

const ROWS = [0, 1, 2, 3, 4] as const;
// Pushes Space to where it sits on a physical ANSI board: Ctrl, Win and Alt at 1.25 units each.
const SPACE_ROW_OFFSET = 3.75;
</script>

<!-- Decorative: the practice text is the accessible surface. Keys are addressable by data-code. -->
<div class="keyboard" aria-hidden="true">
  <div class="board">
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
