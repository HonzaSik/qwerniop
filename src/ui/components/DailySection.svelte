<script lang="ts">
import type { Layout } from "../../core/layouts/layout";
import { dailySummary } from "../../core/stats/daily";
import { dayKey } from "../../core/stats/practice";
import { readSessions, savesSessions } from "../state.svelte";
import { t } from "../strings";
import { dailyDate, td } from "../strings/daily";
import DailyCopy from "./DailyCopy.svelte";
import { formatAccuracy } from "./session-summary";

interface Props {
  layout: Layout["id"];
  onstart: () => void;
}

let { layout, onstart }: Props = $props();

const date = dayKey(Date.now());
const summary = $derived(
  readSessions().then((records) => dailySummary(records, layout, date)),
);
</script>

{#if savesSessions()}
  <section aria-labelledby="track-daily">
    <h2 id="track-daily">{td.title}</h2>
    {#await summary then s}
      {#if s.today}
        <dl>
          <div>
            <dt>{td.scoreLabel}</dt>
            <dd>{t.lessons.wpm(Math.round(s.today.wpm))} · {formatAccuracy(s.today.accuracy)}</dd>
          </div>
          {#if s.best}
            <div>
              <dt>{td.bestLabel}</dt>
              <dd>{t.lessons.wpm(Math.round(s.best.wpm))} · {dailyDate(s.best.date)}</dd>
            </div>
          {/if}
          <div>
            <dt>{td.daysLabel}</dt>
            <dd>{s.days}</dd>
          </div>
        </dl>
        <div class="actions">
          <DailyCopy {date} {layout} score={s.today} />
          <button type="button" onclick={onstart}>{td.again}</button>
        </div>
      {:else}
        <p class="note">{td.intro}</p>
        <button type="button" class="primary" onclick={onstart}>{td.start}</button>
      {/if}
    {/await}
  </section>
{/if}

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
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  dl {
    display: grid;
    gap: var(--space-1);
    margin: var(--space-2) 0 var(--space-3);
    font-size: var(--text-size-sm);
  }

  dl div {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
  }

  dt {
    color: var(--text-2);
  }

  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .actions :global(.note) {
    order: 1;
    flex-basis: 100%;
    margin-top: 0;
  }
</style>
