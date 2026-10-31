<script lang="ts">
import type { SessionRecord } from "../../core/engine/record";
import { layoutById } from "../../core/layouts/registry";
import { heatScale, keyErrors, recentSessions } from "../../core/stats/history";
import DataTransfer from "../components/DataTransfer.svelte";
import Keyboard from "../components/Keyboard.svelte";
import { keyLabel } from "../components/keyboard-labels";
import LineChart from "../components/LineChart.svelte";
import { readSessions, ui } from "../state.svelte";

interface Props {
  /** Resolves when storage has been read; opening the view starts the read. */
  sessions: Promise<SessionRecord[]>;
  onimported: () => void;
}

let { sessions: opened, onimported }: Props = $props();
// Re-read after an import so the charts show the new data.
let reread: Promise<SessionRecord[]> | null = $state(null);
const sessions = $derived(reread ?? opened);

const WORST_KEYS = 5;

function summarise(records: SessionRecord[]) {
  const layout = layoutById(ui.settings.layout);
  const recent = recentSessions(records, layout.id);
  const counts = keyErrors(layout, records);
  const worst = [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, WORST_KEYS)
    .flatMap(([code, n]) => {
      const key = layout.keys.find((k) => k.code === code);
      return key ? [{ name: keyLabel(key).main || key.code, n }] : [];
    });
  return { recent, heat: heatScale(counts), worst };
}
</script>

<main aria-label="Stats">
  {#await sessions}
    <p class="note">Loading</p>
  {:then records}
    {@const s = summarise(records)}
    {#if s.recent.length === 0}
      <p class="note">No sessions yet. Finish a practice session and it will show up here.</p>
    {:else}
      <section aria-labelledby="history">
        <h2 id="history">History</h2>
        <LineChart title="Speed" unit="wpm" values={s.recent.map((r) => Math.round(r.wpm))} />
        <LineChart title="Accuracy" unit="%" max={100} values={s.recent.map((r) => Math.round(r.accuracy * 100))} />
      </section>
      <section aria-labelledby="keys">
        <h2 id="keys">Errors by key</h2>
        {#if s.worst.length === 0}
          <p class="note">No errors recorded.</p>
        {:else}
          <div class="board"><Keyboard layout={layoutById(ui.settings.layout)} mode="heat" heat={s.heat} /></div>
          <p class="note">
            Most missed:
            {#each s.worst as w, i}{i > 0 ? ", " : ""}{w.name} ({w.n}){/each}
          </p>
        {/if}
      </section>
    {/if}
  {:catch}
    <p class="note">Stats could not be loaded.</p>
  {/await}
  <DataTransfer onimported={() => { reread = readSessions(); onimported(); }} />
</main>

<style>
  main {
    box-sizing: border-box;
    width: min(100%, var(--practice-column));
    min-height: 100vh;
    margin: 0 auto;
    padding: calc(var(--space-6) + var(--space-4)) var(--space-4) var(--space-6);
  }

  section {
    margin-bottom: var(--space-6);
  }

  h2 {
    margin: 0 0 var(--space-3);
    font-size: var(--text-size-md);
    font-weight: var(--weight-semibold);
  }

  .note {
    margin: var(--space-1) 0 var(--space-3);
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }
</style>
