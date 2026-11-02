<script lang="ts" generics="T extends string">
import type { Snippet } from "svelte";
import { nextTab } from "./tabs";

interface Props {
  label: string;
  tabs: readonly { id: T; label: string }[];
  selected: T;
  children: Snippet;
}

let { label, tabs, selected = $bindable(), children }: Props = $props();

const buttons: HTMLButtonElement[] = [];

function onkeydown(event: KeyboardEvent, index: number): void {
  const next = nextTab(event.key, index, tabs.length);
  const tab = next === undefined ? undefined : tabs[next];
  if (next === undefined || !tab) return;
  event.preventDefault();
  selected = tab.id;
  buttons[next]?.focus();
}
</script>

<div class="tabs" role="tablist" aria-label={label}>
  {#each tabs as tab, i}
    <button
      type="button"
      role="tab"
      id="tab-{tab.id}"
      aria-selected={tab.id === selected}
      aria-controls="tab-panel"
      tabindex={tab.id === selected ? 0 : -1}
      bind:this={buttons[i]}
      onclick={() => (selected = tab.id)}
      onkeydown={(event) => onkeydown(event, i)}
    >
      {tab.label}
    </button>
  {/each}
</div>
<div id="tab-panel" role="tabpanel" aria-labelledby="tab-{selected}">
  {@render children()}
</div>

<style>
  /* A filled rail of raised segments: plain text labels did not read as something to press. */
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin-bottom: var(--space-5);
    padding: var(--space-1);
    border-radius: var(--radius-control);
    background: var(--surface);
  }

  button {
    flex: 1 1 auto;
    min-height: calc(var(--control-height) + var(--space-1));
    padding: var(--space-1) var(--space-4);
    border-color: transparent;
    background: none;
    color: var(--text);
    font-size: var(--text-size-md);
  }

  button[aria-selected="true"] {
    border-color: var(--accent);
    background: var(--bg);
    color: var(--accent);
    font-weight: var(--weight-semibold);
  }
</style>
