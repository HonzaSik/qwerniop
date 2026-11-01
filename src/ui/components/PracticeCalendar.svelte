<script lang="ts">
import { calendarDays, practiceLevel } from "../../core/stats/practice";
import { t } from "../strings";

interface Props {
  /** Milliseconds practised per "YYYY-MM-DD" local day. */
  days: ReadonlyMap<string, number>;
  today: number;
}

let { days, today }: Props = $props();

// A year of columns does not fit a phone without shrinking cells below a tap's worth, so narrow screens show four months.
const narrow = matchMedia("(width < 720px)");
let weeks = $state(narrow.matches ? 17 : 53);
$effect(() => {
  const update = () => {
    weeks = narrow.matches ? 17 : 53;
  };
  narrow.addEventListener("change", update);
  return () => narrow.removeEventListener("change", update);
});

const CELL = 11;
const STEP = 14;
const LEFT = 38;
// A short month name needs about three columns; closer labels would overlap or run off the edge.
const LABEL_COLUMNS = 3;
const TOP = 16;
const LEVELS = [0, 1, 2, 3, 4] as const;

const parse = (key: string): Date => {
  const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const columns = $derived(calendarDays(today, weeks, t.stats.weekStart));
const monthFormat = $derived(
  new Intl.DateTimeFormat(t.language, { month: "short" }),
);
const dayFormat = $derived(
  new Intl.DateTimeFormat(t.language, { day: "numeric", month: "short" }),
);
const weekdayFormat = $derived(
  new Intl.DateTimeFormat(t.language, { weekday: "short" }),
);

// A month is named above the first column whose first day falls in it, when it has room.
const months = $derived.by(() => {
  const out: { x: number; label: string }[] = [];
  let lastAt = -LABEL_COLUMNS;
  columns.forEach((column, i) => {
    const first = column[0];
    if (first === undefined) return;
    const before = columns[i - 1]?.[0];
    const starts =
      before === undefined ||
      parse(before).getMonth() !== parse(first).getMonth();
    if (
      !starts ||
      i - lastAt < LABEL_COLUMNS ||
      i > columns.length - LABEL_COLUMNS
    ) {
      return;
    }
    out.push({ x: LEFT + i * STEP, label: monthFormat.format(parse(first)) });
    lastAt = i;
  });
  return out;
});
// Every other weekday, as GitHub does, so the labels never crowd.
const weekdays = $derived(
  [1, 3, 5].flatMap((row) => {
    const key = columns[0]?.[row];
    return key === undefined
      ? []
      : [
          {
            y: TOP + row * STEP + CELL - 2,
            label: weekdayFormat.format(parse(key)),
          },
        ];
  }),
);
const practised = $derived(
  columns.flat().filter((key) => (days.get(key) ?? 0) > 0).length,
);
const minutes = (ms: number): number => Math.round(ms / 60_000);
</script>

<figure>
  <svg
    viewBox="0 0 {LEFT + weeks * STEP} {TOP + 7 * STEP}"
    role="img"
    aria-label={t.stats.calendar(practised)}
  >
    {#each months as m}<text x={m.x} y={TOP - 5} class="label">{m.label}</text>{/each}
    {#each weekdays as d}<text x={LEFT - 6} y={d.y} class="label day">{d.label}</text>{/each}
    {#each columns as column, i}
      {#each column as key, row}
        {@const ms = days.get(key) ?? 0}
        <rect x={LEFT + i * STEP} y={TOP + row * STEP} width={CELL} height={CELL} rx="2" class="level-{practiceLevel(ms)}">
          <title>{dayFormat.format(parse(key))}: {t.stats.minutes(minutes(ms))}</title>
        </rect>
      {/each}
    {/each}
  </svg>
  <figcaption>
    <!-- The figure's aria-label already says this; hidden so it is not read twice. -->
    <span aria-hidden="true">{t.stats.calendar(practised)}</span>
    <span class="legend" aria-hidden="true">
      {t.stats.less}
      <svg viewBox="0 0 {LEVELS.length * STEP} {CELL}" width={LEVELS.length * STEP} height={CELL}>
        {#each LEVELS as level, i}<rect x={i * STEP} width={CELL} height={CELL} rx="2" class="level-{level}" />{/each}
      </svg>
      {t.stats.more}
    </span>
  </figcaption>
</figure>

<style>
  figure {
    margin: 0;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
  }

  .label {
    fill: var(--text-2);
    font-size: var(--text-size-sm);
  }

  .day {
    text-anchor: end;
  }

  .level-0 {
    fill: var(--surface);
  }

  .level-1 {
    fill: color-mix(in srgb, var(--accent) var(--calendar-mix-1), var(--surface));
  }

  .level-2 {
    fill: color-mix(in srgb, var(--accent) var(--calendar-mix-2), var(--surface));
  }

  .level-3 {
    fill: color-mix(in srgb, var(--accent) var(--calendar-mix-3), var(--surface));
  }

  .level-4 {
    fill: var(--accent);
  }

  figcaption {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-2);
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  .legend {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }

  .legend svg {
    width: auto;
  }
</style>
