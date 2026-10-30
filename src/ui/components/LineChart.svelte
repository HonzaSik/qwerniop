<script lang="ts">
import { niceMax } from "../../core/stats/history";

interface Props {
  title: string;
  unit: string;
  values: readonly number[];
  /** Fixed top of the y axis; defaults to a round number above the data. */
  max?: number;
}

let { title, unit, values, max }: Props = $props();

const W = 600;
const H = 160;
const PAD = { left: 40, right: 12, top: 12, bottom: 12 };

const top = $derived(max ?? niceMax(Math.max(0, ...values)));
const x = (i: number) =>
  values.length < 2
    ? (PAD.left + W - PAD.right) / 2
    : PAD.left + (i / (values.length - 1)) * (W - PAD.left - PAD.right);
const y = (v: number) =>
  H - PAD.bottom - (v / top) * (H - PAD.top - PAD.bottom);
const points = $derived(values.map((v, i) => `${x(i)},${y(v)}`).join(" "));
const last = $derived(values.at(-1) ?? 0);
const summary = $derived(
  `${title} over the last ${values.length} sessions: latest ${last} ${unit}, lowest ${Math.min(...values)}, highest ${Math.max(...values)}.`,
);
</script>

<figure>
  <figcaption>{title} <span class="latest">{last} {unit}</span></figcaption>
  <svg viewBox="0 0 {W} {H}" role="img" aria-label={summary}>
    {#each [0, top / 2, top] as tick}
      <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} class="grid" />
      <text x={PAD.left - 6} y={y(tick)} class="tick">{tick}</text>
    {/each}
    <polyline {points} class="line" />
    {#each values as v, i}
      <circle cx={x(i)} cy={y(v)} r="3" class="dot" />
    {/each}
  </svg>
</figure>

<style>
  figure {
    margin: 0 0 var(--space-4);
  }

  figcaption {
    font-size: var(--text-size-sm);
    color: var(--text-2);
  }

  .latest {
    margin-left: var(--space-2);
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
  }

  .grid {
    stroke: var(--separator);
  }

  .tick {
    fill: var(--text-2);
    font-size: 13px;
    text-anchor: end;
    dominant-baseline: middle;
    font-variant-numeric: tabular-nums;
  }

  .line {
    fill: none;
    stroke: var(--accent);
    stroke-width: var(--chart-line-width);
    stroke-linejoin: round;
  }

  .dot {
    fill: var(--accent);
  }
</style>
