<script lang="ts">
import type { MissRate } from "../../core/adaptive/mistakes";
import { t } from "../strings";
import { formatAccuracy } from "./session-summary";

interface Props {
  weak: readonly MissRate[];
  onstart: () => void;
}

let { weak, onstart }: Props = $props();
</script>

<section aria-labelledby="track-weak">
  <h2 id="track-weak">{t.weak.title}</h2>
  <p class="note">{t.weak.intro}</p>
  {#if weak.length > 0}
    <ul>
      {#each weak as { char, rate }}
        <li><kbd>{char}</kbd> {formatAccuracy(rate)}</li>
      {/each}
    </ul>
    <button type="button" class="primary" onclick={onstart}>{t.weak.start}</button>
  {:else}
    <p class="note">{t.weak.empty}</p>
  {/if}
</section>

<style>
  section {
    margin-bottom: var(--space-6);
  }

  h2 {
    margin: 0;
    font-size: var(--text-size-md);
    font-weight: var(--weight-semibold);
  }

  .note {
    margin: var(--space-1) 0 var(--space-3);
  }

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    margin: 0 0 var(--space-3);
    padding: 0;
    list-style: none;
    font-variant-numeric: tabular-nums;
  }
</style>
