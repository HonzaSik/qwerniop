<script lang="ts">
import { keyMissRates } from "../../core/adaptive/mistakes";
import type { SessionRecord } from "../../core/engine/record";
import { layoutById } from "../../core/layouts/registry";
import { heatScale, overview, recentSessions } from "../../core/stats/history";
import { petState } from "../../core/stats/pet";
import { petMemories } from "../../core/stats/pet-memories";
import {
  dayKey,
  practiceByDay,
  practiceStreak,
  recentSpread,
} from "../../core/stats/practice";
import CombinationStats from "../components/CombinationStats.svelte";
import DataTransfer from "../components/DataTransfer.svelte";
import Keyboard from "../components/Keyboard.svelte";
import { keyLabel } from "../components/keyboard-labels";
import LineChart from "../components/LineChart.svelte";
import PetStats from "../components/PetStats.svelte";
import PetStreak from "../components/PetStreak.svelte";
import PracticeCalendar from "../components/PracticeCalendar.svelte";
import { formatAccuracy, formatChange } from "../components/session-summary";
import Tabs from "../components/Tabs.svelte";
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
const summary = $derived((reread ?? opened).then(summarise));

type Tab = "overview" | "keys" | "pet" | "data";
let tab = $state<Tab>("overview");

const WORST_KEYS = 5;

function summarise(records: SessionRecord[]) {
  const layout = layoutById(ui.settings.layout);
  const recent = recentSessions(records, layout.id);
  const rates = keyMissRates(layout, ui.progress.stats);
  const worst = [...rates]
    .sort((a, b) => b[1] - a[1])
    .slice(0, WORST_KEYS)
    .flatMap(([code, rate]) => {
      const key = layout.keys.find((k) => k.code === code);
      return key ? [{ name: keyLabel(key).main || key.code, rate }] : [];
    });
  const days = practiceByDay(records);
  const today = Date.now();
  const msToday = days.get(dayKey(today))?.ms ?? 0;
  // A reduce, not a spread: sessions are never pruned, and a spread of every record could overflow the stack.
  const first = records.reduce((m, r) => Math.min(m, r.at), today);
  return {
    records,
    recent,
    overview: overview(records, layout.id),
    heat: heatScale(rates),
    worst,
    days,
    today,
    first,
    msToday,
    spread: recentSpread(days, today),
    pet: petState(days, today),
    streak: practiceStreak(days, today),
    memories: petMemories(records, today),
  };
}
</script>

<main aria-label={t.nav.stats}>
  <h1>{t.nav.stats}</h1>
  {#await summary then s}
    {#if s.records.length > 0}
      <dl class="figures">
        {#if s.overview.recent}
          {@const recent = s.overview.recent}
          <div>
            <dt>{t.stats.speed}</dt>
            <dd>{Math.round(recent.wpm)} <span class="unit">{t.stats.wpmUnit}</span></dd>
            <dd class="detail">{recent.change ? t.stats.changeFrom(formatChange(recent.change.wpm)) : t.stats.lastSessions(recent.sessions)}</dd>
          </div>
          <div>
            <dt>{t.stats.accuracy}</dt>
            <dd>{formatAccuracy(recent.accuracy)}</dd>
            <dd class="detail">{recent.change ? t.stats.changeFrom(formatChange(recent.change.accuracy * 100)) : t.stats.lastSessions(recent.sessions)}</dd>
          </div>
        {/if}
        <div>
          <dt>{t.stats.totalTime}</dt>
          <dd>{t.stats.time(s.overview.totalMs)}</dd>
          <dd class="detail">{t.stats.today(s.msToday)}</dd>
        </div>
        <div>
          <dt>{t.stats.lastWeek}</dt>
          <dd>{t.stats.daysOfWeek(s.spread.days)}</dd>
          <dd class="detail">{t.stats.spread(s.spread.days, s.spread.minutes)}</dd>
        </div>
      </dl>
    {/if}
  {:catch}
    <!-- The panel below says so. -->
  {/await}
  <Tabs
    label={t.stats.sections}
    tabs={[
      { id: "overview", label: t.stats.overview },
      { id: "keys", label: t.stats.keys },
      { id: "pet", label: t.stats.pet },
      { id: "data", label: t.data.title },
    ]}
    bind:selected={tab}
  >
    {#if tab === "data"}
      <!-- Outside the await, so its status line survives the re-read an import starts. -->
      <DataTransfer onimported={() => { reread = readSessions(); onimported(); }} />
    {:else}
      {#await summary}
        <p class="note">{t.stats.loading}</p>
      {:then s}
        {#if s.records.length === 0}
          <p class="note">{t.stats.empty}</p>
        {:else if tab === "overview"}
          {#if s.recent.length === 0}
            <p class="note">{t.stats.empty}</p>
          {:else}
            <section aria-label={t.stats.history} class="charts">
              <LineChart title={t.stats.speed} unit={t.stats.wpmUnit} values={s.recent.map((r) => Math.round(r.wpm))} />
              <LineChart title={t.stats.accuracy} unit="%" max={100} values={s.recent.map((r) => Math.round(r.accuracy * 100))} />
            </section>
          {/if}
          <section aria-labelledby="practice">
            <h2 id="practice">{t.stats.practice}</h2>
            <PracticeCalendar days={s.days} today={s.today} first={s.first} />
          </section>
        {:else if tab === "keys"}
          {#if s.recent.length === 0}
            <p class="note">{t.stats.empty}</p>
          {:else}
            <section aria-labelledby="keys">
              <h2 id="keys">{t.stats.errorsByKey}</h2>
              {#if s.worst.length === 0}
                <p class="note">{t.stats.noErrors}</p>
              {:else}
                <div class="errors">
                  <div class="board"><Keyboard layout={layoutById(ui.settings.layout)} mode="heat" heat={s.heat} /></div>
                  <div>
                    <p class="note">{t.stats.mostMissed}</p>
                    <ol class="missed">
                      {#each s.worst as w}<li><kbd>{w.name}</kbd> {formatAccuracy(w.rate)}</li>{/each}
                    </ol>
                    <p class="note">{t.stats.mostMissedNote}</p>
                  </div>
                </div>
              {/if}
            </section>
            <CombinationStats layout={ui.settings.layout} pairs={ui.progress.pairs} records={s.records} />
          {/if}
        {:else if s.pet}
          <PetStats pet={s.pet} memories={s.memories} />
        {:else}
          <p class="note">{t.stats.empty}</p>
        {/if}
      {:catch}
        <p class="note">{t.stats.loadFailed}</p>
      {/await}
    {/if}
  </Tabs>
  {#await summary then s}
    {#if s.pet && tab !== "pet"}<PetStreak pet={s.pet} streak={s.streak} />{/if}
  {/await}
</main>

<style>
  main {
    box-sizing: border-box;
    width: min(100%, var(--page-column));
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

  h2 {
    margin: 0 0 var(--space-4);
    font-size: var(--text-size-md);
    font-weight: var(--weight-semibold);
  }

  .figures {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-5) 0;
    margin: 0 0 var(--space-6);
  }

  .figures > div {
    padding: 0 var(--space-4);
    border-left: 1px solid var(--separator);
  }

  /* The first of each row starts at the page edge, so no hairline leads the row. */
  .figures > div:nth-child(odd) {
    padding-left: 0;
    border-left: 0;
  }

  dt {
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  dd {
    margin: var(--space-1) 0 0;
    font-size: var(--text-size-lg);
    font-weight: var(--weight-semibold);
    font-variant-numeric: tabular-nums;
  }

  .unit {
    color: var(--text-2);
    font-size: var(--text-size-sm);
    font-weight: var(--weight-regular);
  }

  .detail {
    color: var(--text-2);
    font-size: var(--text-size-sm);
    font-weight: var(--weight-regular);
  }

  .charts {
    display: grid;
    gap: 0 var(--space-6);
  }

  .errors {
    display: grid;
    gap: var(--space-4) var(--space-6);
  }

  .note {
    margin: var(--space-1) 0 var(--space-3);
  }

  .missed {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
    font-variant-numeric: tabular-nums;
  }

  @media (min-width: 900px) {
    .figures {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .figures > div:nth-child(odd) {
      padding-left: var(--space-4);
      border-left: 1px solid var(--separator);
    }

    .figures > div:first-child {
      padding-left: 0;
      border-left: 0;
    }

    .charts {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .errors {
      grid-template-columns: minmax(0, var(--keyboard-max-width)) 1fr;
      align-items: start;
    }

    .missed {
      flex-direction: column;
    }
  }

  /* Keeps the corner pet off the content when the centred column would reach it. */
  @media (width >= 1100px) {
    main {
      padding-left: max(
        var(--space-4),
        calc(
          var(--pet-corner-width) - max(0px, (100vw - var(--page-column)) / 2)
        )
      );
    }
  }
</style>
