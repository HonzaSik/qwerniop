<script lang="ts">
import {
  type DayPractice,
  dayKey,
  monthGrid,
  practiceLevel,
} from "../../core/stats/practice";
import { t } from "../strings";

interface Props {
  days: ReadonlyMap<string, DayPractice>;
  today: number;
  /** The earliest session, so paging back stops where the data starts. */
  first: number;
}

let { days, today, first }: Props = $props();

const monthIndex = (at: number): number => {
  const d = new Date(at);
  return d.getFullYear() * 12 + d.getMonth();
};

// Months are counted from year 0, so stepping across a year is plain arithmetic.
let shown = $state(monthIndex(Date.now()));
const year = $derived(Math.floor(shown / 12));
const month = $derived(shown % 12);
const rows = $derived(monthGrid(year, month, t.stats.weekStart));
const todayKey = $derived(dayKey(today));

const title = $derived(
  new Intl.DateTimeFormat(t.language, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1)),
);
// Any week of the grid gives the weekday order; a fixed reference week keeps the names stable.
const weekdays = $derived.by(() => {
  const format = new Intl.DateTimeFormat(t.language, { weekday: "short" });
  // 4 January 1970 was a Sunday.
  return Array.from({ length: 7 }, (_, i) =>
    format.format(new Date(1970, 0, 4 + t.stats.weekStart + i)),
  );
});

const minutes = (ms: number): number => Math.round(ms / 60_000);
const inMonth = $derived(
  rows.flat().flatMap((key) => {
    const day = key === undefined ? undefined : days.get(key);
    return day ? [day] : [];
  }),
);
const summary = $derived(
  t.stats.monthSummary(
    inMonth.length,
    minutes(inMonth.reduce((sum, d) => sum + d.ms, 0)),
  ),
);
const dayOf = (key: string): number => Number(key.slice(8));
const parse = (key: string): Date =>
  new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, dayOf(key));
const dateFormat = $derived(
  new Intl.DateTimeFormat(t.language, { day: "numeric", month: "long" }),
);
const LEVELS = [0, 1, 2, 3, 4] as const;
</script>

<figure>
  <div class="header">
    <button
      type="button"
      aria-label={t.stats.previousMonth}
      disabled={shown <= monthIndex(first)}
      onclick={() => shown--}
    >‹</button>
    <h3 aria-live="polite">{title}</h3>
    <button
      type="button"
      aria-label={t.stats.nextMonth}
      disabled={shown >= monthIndex(today)}
      onclick={() => shown++}
    >›</button>
  </div>
  <table>
    <thead>
      <tr>{#each weekdays as d}<th scope="col">{d}</th>{/each}</tr>
    </thead>
    <tbody>
      {#each rows as week}
        <tr>
          {#each week as key}
            {#if key === undefined}
              <td></td>
            {:else}
              {@const day = days.get(key) ?? { ms: 0, sessions: 0 }}
              <td>
                <!-- A button so the count shows on keyboard focus and on a tap, not only on hover. -->
                <button
                  type="button"
                  class="cell level-{practiceLevel(day.ms)}"
                  class:today={key === todayKey}
                  disabled={key > todayKey}
                  aria-current={key === todayKey ? "date" : undefined}
                  aria-label="{dateFormat.format(parse(key))}: {t.stats.dayTip(minutes(day.ms), day.sessions)}"
                >
                  <span class="date" aria-hidden="true">{dayOf(key)}</span>
                  <span class="tip" aria-hidden="true">{t.stats.dayTip(minutes(day.ms), day.sessions)}</span>
                </button>
              </td>
            {/if}
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
  <figcaption>
    <span>{summary}</span>
    <span class="legend" aria-hidden="true">
      {t.stats.less}
      {#each LEVELS as level}<span class="swatch level-{level}"></span>{/each}
      {t.stats.more}
    </span>
  </figcaption>
</figure>

<style>
  figure {
    margin: 0;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-3);
  }

  h3 {
    margin: 0;
    font-size: var(--text-size-md);
    font-weight: var(--weight-semibold);
  }

  .header button {
    min-width: var(--control-height);
    font-size: var(--text-size-md);
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: var(--space-1);
    table-layout: fixed;
  }

  th {
    color: var(--text-2);
    font-size: var(--text-size-sm);
    font-weight: var(--weight-regular);
  }

  td {
    padding: 0;
  }

  .cell {
    position: relative;
    display: flex;
    width: 100%;
    /* Wider than tall: square cells across the full column would make the month taller than the screen. */
    height: var(--calendar-cell-height);
    min-height: 0;
    align-items: center;
    justify-content: center;
    padding: 0;
    box-sizing: border-box;
    border: 0;
    border-radius: var(--radius-key);
    color: var(--text);
    font-size: var(--text-size-sm);
    font-variant-numeric: tabular-nums;
  }

  /* The full accent takes the window colour for the number, as the primary button does. */
  .cell.level-4 {
    color: var(--bg);
  }

  /* Days still to come hold nothing to show; the outline keeps the month's shape. */
  .cell:disabled {
    border: 1px solid var(--separator);
    background: none;
    color: var(--text-3);
  }

  .cell.today {
    outline: var(--focus-ring-width) dashed var(--text-2);
    outline-offset: calc(-1 * var(--focus-ring-width));
  }

  .level-0 {
    background: var(--surface);
  }

  .level-1 {
    background: color-mix(in srgb, var(--accent) var(--calendar-mix-1), var(--surface));
  }

  .level-2 {
    background: color-mix(in srgb, var(--accent) var(--calendar-mix-2), var(--surface));
  }

  .level-3 {
    background: color-mix(in srgb, var(--accent) var(--calendar-mix-3), var(--surface));
  }

  .level-4 {
    background: var(--accent);
  }

  /* In the DOM for screen readers; shown on hover or focus for everyone else. */
  .tip {
    position: absolute;
    z-index: 1;
    bottom: calc(100% + var(--space-1));
    left: 50%;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--separator);
    border-radius: var(--radius-control);
    background: var(--bg);
    color: var(--text);
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transform: translateX(-50%);
  }

  /* Edge columns anchor the tip inward, so it never leaves the page. */
  td:first-child .tip,
  td:nth-child(2) .tip {
    left: 0;
    transform: none;
  }

  td:last-child .tip,
  td:nth-last-child(2) .tip {
    right: 0;
    left: auto;
    transform: none;
  }

  .cell:not(:disabled):hover .tip,
  .cell:focus .tip {
    opacity: 1;
  }

  :global(:root:not([data-reduce-motion])) .tip {
    transition: opacity var(--duration-press) var(--ease);
  }

  figcaption {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-3);
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  .legend {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }

  .swatch {
    width: var(--space-3);
    height: var(--space-3);
    border-radius: calc(var(--radius-key) / 3);
  }
</style>
