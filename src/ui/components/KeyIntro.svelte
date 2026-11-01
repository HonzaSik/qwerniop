<script lang="ts">
import type { Layout } from "../../core/layouts/layout";
import { HOME_KEYS, type KeyGuide, keyGuide } from "../../core/lessons/intro";
import { t } from "../strings";
import Keyboard from "./Keyboard.svelte";
import { keyLabel } from "./keyboard-labels";

interface Props {
  layout: Layout;
  /** The lesson's new characters, in the order the lesson adds them. */
  chars: readonly string[];
  onstart: () => void;
  onskip: () => void;
}

let { layout, chars, onstart, onskip }: Props = $props();

const label = (code: string): string => {
  const key = layout.keys.find((k) => k.code === code);
  return key ? keyLabel(key).main || code : code;
};

const guides = $derived(
  chars.flatMap((char) => {
    const guide = keyGuide(layout, char);
    return guide ? [{ char, guide }] : [];
  }),
);

const side = (shift: KeyGuide["shift"]): "left" | "right" | undefined =>
  shift === "ShiftLeft" ? "left" : shift === "ShiftRight" ? "right" : undefined;

function path(g: KeyGuide): string {
  if (g.finger === "T") return t.intro.thumb;
  if (g.code === HOME_KEYS[g.finger]) return t.intro.home;
  return t.intro.reach(label(g.home), g.rows, g.side);
}

// New keys are ringed in accent; each one's home key is dashed so the reach reads as a line from it.
const marked = $derived(
  new Map<string, "new" | "home">([
    ...guides.map(({ guide }) => [guide.home, "home"] as const),
    ...guides.flatMap(({ guide }) =>
      guide.dead ? [[guide.dead.code, "new"] as const] : [],
    ),
    ...guides.map(({ guide }) => [guide.code, "new"] as const),
  ]),
);

function focusOnShow(button: HTMLButtonElement): void {
  // Enter should start the drill, as it continues from the summary.
  button.focus({ preventScroll: true });
}
</script>

<section aria-labelledby="intro-title">
  <h2 id="intro-title">{t.intro.title(chars.join(" "))}</h2>
  <p class="note">{t.intro.note}</p>
  <ul>
    {#each guides as { char, guide }}
      <li>
        <span class="char">{char === " " ? "␣" : char}</span>
        <span class="how">
          <strong>{t.intro.fingers[guide.finger]}</strong>
          <span>{path(guide)}</span>
          {#if guide.dead}<span>{t.intro.dead(guide.dead.mark || label(guide.dead.code), side(guide.dead.shift))}</span>{/if}
          {#if guide.shift}<span>{t.intro.shift(guide.shift === "ShiftLeft")}</span>{/if}
        </span>
      </li>
    {/each}
  </ul>
  <div class="board"><Keyboard {layout} mode="fingers" {marked} /></div>
  <div class="actions">
    <button class="primary" aria-keyshortcuts="Enter" onclick={onstart} use:focusOnShow>{t.intro.start}</button>
    <button onclick={onskip}>{t.intro.skip}</button>
  </div>
</section>

<style>
  section {
    display: grid;
    gap: var(--space-5);
    justify-items: center;
  }

  h2 {
    margin: 0;
    font-size: var(--text-size-xl);
    font-weight: var(--weight-semibold);
  }

  .note {
    font-size: var(--text-size-md);
    text-align: center;
  }

  ul {
    display: grid;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .char {
    display: grid;
    width: calc(var(--control-height) * 1.5);
    aspect-ratio: 1;
    place-items: center;
    border: var(--keyboard-next-ring) solid var(--accent);
    border-radius: var(--radius-control);
    font-family: var(--font-practice);
    font-size: var(--text-size-practice);
  }

  .how {
    display: grid;
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  strong {
    color: var(--text);
    font-size: var(--text-size-md);
    font-weight: var(--weight-semibold);
  }

  .board {
    display: flex;
    width: 100%;
    justify-content: center;
  }

  .actions {
    display: flex;
    gap: var(--space-3);
  }

  /* The one action of the screen, so a size up from other buttons, as in the summary. */
  button {
    min-height: calc(var(--control-height) + var(--space-2));
    padding: 0 var(--space-5);
    font-size: var(--text-size-md);
  }

  :global(:root:not([data-reduce-motion])) section {
    animation: appear var(--duration-view) var(--ease);
  }

  @keyframes appear {
    from {
      opacity: 0;
    }
  }
</style>
