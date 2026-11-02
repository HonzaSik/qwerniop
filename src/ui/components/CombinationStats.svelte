<script lang="ts">
import type { SessionRecord } from "../../core/engine/record";
import type { Layout } from "../../core/layouts/layout";
import {
  type PairStats,
  slowestPairs,
  transitionSummary,
} from "../../core/stats/pairs";
import { t } from "../strings";
import { formatAccuracy, formatChange } from "./session-summary";

interface Props {
  layout: Layout["id"];
  pairs: PairStats;
  records: readonly SessionRecord[];
}

let { layout, pairs, records }: Props = $props();

const slow = $derived(slowestPairs(pairs));
const moves = $derived(transitionSummary(records, layout));
const ms = (value: number): string => String(Math.round(value));
const change = (value: number | undefined): string =>
  value === undefined ? "–" : formatChange(value);
</script>

<div class="tables">
  <section aria-labelledby="combinations">
    <h2 id="combinations">{t.stats.combinations}</h2>
    {#if slow.length === 0}
      <p class="note">{t.stats.combinationsEmpty}</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th scope="col">{t.stats.pair}</th>
            <th scope="col" class="number">{t.stats.msPerKey}</th>
            <th scope="col" class="number">{t.stats.accuracy}</th>
            <th scope="col" class="number">{t.stats.pairChange}</th>
          </tr>
        </thead>
        <tbody>
          {#each slow as row}
            <tr>
              <th scope="row" class="pair">{row.pair}</th>
              <td class="number">{ms(row.ms)}</td>
              <td class="number">{formatAccuracy(row.accuracy)}</td>
              <td class="number">{change(row.change)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="note">{t.stats.combinationsNote}</p>
    {/if}
  </section>

  {#if moves.length > 0}
    <section aria-labelledby="moves">
      <h2 id="moves">{t.stats.moves}</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">{t.stats.move}</th>
            <th scope="col" class="number">{t.stats.earlier}</th>
            <th scope="col" class="number">{t.stats.recent}</th>
          </tr>
        </thead>
        <tbody>
          {#each moves as row}
            <tr>
              <th scope="row">{t.stats.moveNames[row.kind]}</th>
              <td class="number">{row.earlier === undefined ? "–" : ms(row.earlier)}</td>
              <td class="number">{ms(row.recent)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="note">{t.stats.movesNote}</p>
    </section>
  {/if}
</div>

<style>
  section {
    margin-bottom: var(--space-7);
  }

  .tables {
    display: grid;
    gap: 0 var(--space-6);
  }

  @media (min-width: 900px) {
    .tables {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
    }
  }

  h2 {
    margin: 0 0 var(--space-4);
    font-size: var(--text-size-md);
    font-weight: var(--weight-semibold);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-size-sm);
  }

  th,
  td {
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--separator);
    font-weight: var(--weight-regular);
    text-align: left;
  }

  thead th {
    color: var(--text-2);
  }

  .number {
    padding-left: var(--space-3);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .pair {
    font-family: var(--font-practice);
    font-size: var(--text-size-md);
  }

  .note {
    margin-top: var(--space-3);
  }
</style>
