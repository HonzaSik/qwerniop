<script lang="ts">
import type { SessionRecord } from "../../core/engine/record";
import { layoutById } from "../../core/layouts/registry";
import { heatScale, keyErrors, recentSessions } from "../../core/stats/history";
import { petState } from "../../core/stats/pet";
import { dayKey, practiceByDay, recentSpread } from "../../core/stats/practice";
import CombinationStats from "../components/CombinationStats.svelte";
import DataTransfer from "../components/DataTransfer.svelte";
import Keyboard from "../components/Keyboard.svelte";
import { keyLabel } from "../components/keyboard-labels";
import LineChart from "../components/LineChart.svelte";
import PetStats from "../components/PetStats.svelte";
import PracticeCalendar from "../components/PracticeCalendar.svelte";
import { readSessions, ui } from "../state.svelte";
import { t } from "../strings";

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
  const days = practiceByDay(records);
  const today = Date.now();
  const minutesToday = Math.round((days.get(dayKey(today))?.ms ?? 0) / 60_000);
  // A reduce, not a spread: sessions are never pruned, and a spread of every record could overflow the stack.
  const first = records.reduce((m, r) => Math.min(m, r.at), today);
  return {
    recent,
    heat: heatScale(counts),
    worst,
    days,
    today,
    first,
    minutesToday,
    spread: recentSpread(days, today),
    pet: petState(days, today),
  };
}
</script>

<main aria-label={t.nav.stats}>
  <h1>{t.nav.stats}</h1>
  {#await sessions}
    <p class="note">{t.stats.loading}</p>
  {:then records}
    {@const s = summarise(records)}
    {#if records.length > 0}
      <section aria-labelledby="practice">
        <div class="heading">
          <h2 id="practice">{t.stats.practice}</h2>
          <p class="today">{t.stats.today(s.minutesToday)}</p>
        </div>
        <PracticeCalendar days={s.days} today={s.today} first={s.first} />
        <p class="note spread">{t.stats.spread(s.spread.days, s.spread.minutes)}</p>
      </section>
      {#if s.pet}<PetStats pet={s.pet} />{/if}
    {/if}
    {#if s.recent.length === 0}
      <p class="note">{t.stats.empty}</p>
    {:else}
      <section aria-labelledby="history">
        <h2 id="history">{t.stats.history}</h2>
        <LineChart title={t.stats.speed} unit={t.stats.wpmUnit} values={s.recent.map((r) => Math.round(r.wpm))} />
        <LineChart title={t.stats.accuracy} unit="%" max={100} values={s.recent.map((r) => Math.round(r.accuracy * 100))} />
      </section>
      <CombinationStats layout={ui.settings.layout} pairs={ui.progress.pairs} {records} />
      <section aria-labelledby="keys">
        <h2 id="keys">{t.stats.errorsByKey}</h2>
        {#if s.worst.length === 0}
          <p class="note">{t.stats.noErrors}</p>
        {:else}
          <div class="board"><Keyboard layout={layoutById(ui.settings.layout)} mode="heat" heat={s.heat} /></div>
          <p class="note">
            {t.stats.mostMissed}
            {#each s.worst as w, i}{i > 0 ? ", " : ""}{w.name} ({w.n}){/each}
          </p>
        {/if}
      </section>
    {/if}
  {:catch}
    <p class="note">{t.stats.loadFailed}</p>
  {/await}
  <DataTransfer onimported={() => { reread = readSessions(); onimported(); }} />
</main>

<style>
  main {
    box-sizing: border-box;
    width: min(100%, var(--practice-column));
    min-height: 100vh;
    margin: 0 auto;
    padding: calc(var(--space-8) + var(--space-4)) var(--space-4) var(--space-6);
  }

  h1 {
    margin: 0 0 var(--space-6);
    font-size: var(--text-size-xl);
    font-weight: var(--weight-semibold);
  }

  section {
    margin-bottom: var(--space-7);
  }

  /* The heading's figure sits beside it, as the unlocked count does in Lessons. */
  .heading {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-1) var(--space-3);
    margin-bottom: var(--space-4);
  }

  .heading h2 {
    margin: 0;
  }

  h2 {
    margin: 0 0 var(--space-4);
    font-size: var(--text-size-md);
    font-weight: var(--weight-semibold);
  }

  .today {
    margin: 0;
    color: var(--text-2);
    font-size: var(--text-size-sm);
    font-variant-numeric: tabular-nums;
  }

  .note {
    margin: var(--space-1) 0 var(--space-3);
  }

  .spread {
    margin: var(--space-2) 0 0;
  }
</style>
