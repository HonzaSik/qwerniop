<script lang="ts">
import { leavesAt, type PetState, TOP_LEVEL } from "../../core/stats/pet";
import { t } from "../strings";

interface Props {
  pet: PetState;
  large?: boolean;
}

let { pet, large = false }: Props = $props();

const BOTTOM = 57;
// Grows wider and taller with each stage, and the sprout grows with it.
const SHAPE = {
  egg: { top: 16, half: 16, stem: 4, leaf: 0.55 },
  baby: { top: 21, half: 17, stem: 6, leaf: 0.75 },
  child: { top: 18, half: 19, stem: 7, leaf: 0.85 },
  teen: { top: 16, half: 20, stem: 8, leaf: 1 },
  adult: { top: 14, half: 23, stem: 8, leaf: 1.1 },
} as const;
const shape = $derived(SHAPE[pet.stage]);
const height = $derived(BOTTOM - shape.top);
const y = $derived(shape.top + height * 0.6);
const apart = $derived(shape.half * 0.5);
const r = $derived(shape.half * 0.25);
const left = $derived(32 - apart);
const right = $derived(32 + apart);
const stemTop = $derived(shape.top - shape.stem);
const dead = $derived(pet.mood === "dead");
const hungry = $derived(pet.mood === "hungry");
const asleep = $derived(dead || (pet.stage === "egg" && !hungry));
const fruit = $derived(pet.level >= TOP_LEVEL);
// Leaves hang lower the longer it goes unfed, so the sprout shows its mood too.
const droop = $derived(dead ? 62 : hungry ? 34 : 0);

const body = $derived.by(() => {
  const { top, half } = shape;
  const x = (share: number): number => half * share;
  const at = (share: number): number => top + height * share;
  return `M32 ${top}C${32 + x(0.58)} ${top} ${32 + half} ${at(0.32)} ${32 + half} ${at(0.6)}C${32 + half} ${at(0.86)} ${32 + x(0.58)} ${BOTTOM} 32 ${BOTTOM}C${32 - x(0.58)} ${BOTTOM} ${32 - half} ${at(0.86)} ${32 - half} ${at(0.6)}C${32 - half} ${at(0.32)} ${32 - x(0.58)} ${top} 32 ${top}Z`;
});

interface Leaf {
  y: number;
  side: 1 | -1;
  turn: number;
  size: number;
}

const leaves = $derived.by((): Leaf[] => {
  const size = shape.leaf;
  const count = leavesAt(pet.level);
  const low = stemTop + shape.stem * 0.55;
  const top: Leaf = { y: stemTop, side: 1, turn: 52, size: size * 0.85 };
  const pair = (at: number, scale: number): Leaf[] => [
    { y: at, side: -1, turn: 0, size: size * scale },
    { y: at, side: 1, turn: 0, size: size * scale },
  ];
  if (count === 1) return [{ y: stemTop, side: 1, turn: 0, size }];
  if (count === 2) return pair(stemTop, 1);
  if (count === 3) return [top, ...pair(stemTop, 1)];
  if (count === 4) return [...pair(low, 0.85), ...pair(stemTop, 1)];
  return [...pair(low, 0.85), top, ...pair(stemTop, 1)];
});
const highest = $derived(stemTop - 11 * shape.leaf);
const haloY = $derived(highest - (fruit ? 5 : 2));
const toLevel = $derived(pet.level + 1);
</script>

<figure class:large>
  <svg class:dead class:hungry viewBox="0 0 64 64" role="img" aria-label={t.pet.label(pet)}>
    <g class="creature">
      {#if dead}<ellipse class="halo" cx="32" cy={haloY} rx="8" ry="2.2" />{/if}

      <path class="stem" d="M32 {shape.top + 1}V{stemTop}" />
      {#each leaves as leaf}
        <path
          class="leaf"
          d="M0 0c-6 0-10-3-11-8 6-1 11 2 11 8Z"
          transform="translate(32 {leaf.y}) scale({leaf.side * leaf.size} {leaf.size}) rotate({leaf.turn - droop})"
        />
      {/each}
      {#if fruit}<circle class="fruit" cx="32" cy={stemTop - 3} r="3" />{/if}

      {#if pet.stage !== "egg"}
        <ellipse class="fur" cx={32 - shape.half * 0.45} cy={BOTTOM + 1} rx="5" ry="3" />
        <ellipse class="fur" cx={32 + shape.half * 0.45} cy={BOTTOM + 1} rx="5" ry="3" />
      {/if}
      {#if pet.stage === "child" || pet.stage === "teen" || pet.stage === "adult"}
        <ellipse class="fur" cx={32 - shape.half} cy={y + 6} rx="3.2" ry="5" transform="rotate(18 {32 - shape.half} {y + 6})" />
        <ellipse class="fur" cx={32 + shape.half} cy={y + 6} rx="3.2" ry="5" transform="rotate(-18 {32 + shape.half} {y + 6})" />
      {/if}
      <path class="fur" d={body} />
      <circle class="speck" cx={32 - shape.half * 0.45} cy={shape.top + height * 0.24} r="2.4" />
      <circle class="speck" cx={32 + shape.half * 0.5} cy={shape.top + height * 0.3} r="1.7" />
      <circle class="speck" cx={32 + shape.half * 0.55} cy={shape.top + height * 0.88} r="1.9" />

      {#if !dead}
        <ellipse class="cheek" cx={left - r * 0.7} cy={y + r + 1} rx="3" ry="1.8" /><ellipse class="cheek" cx={right + r * 0.7} cy={y + r + 1} rx="3" ry="1.8" />
      {/if}
      {#if asleep}
        {#each [left, right] as x}
          <path class="line" d="M{x - r} {y}q{r} {r} {r * 2} 0" />
        {/each}
      {:else}
        <g class="eyes">
          {#each [left, right] as x}
            <circle class="eye" cx={x} cy={y} {r} />
            <circle class="shine" cx={x + r * 0.35} cy={y - r * 0.4} r={r * 0.34} />
            <circle class="shine" cx={x - r * 0.35} cy={y + r * 0.4} r={r * (hungry ? 0.26 : 0.16)} />
          {/each}
        </g>
      {/if}
      {#if hungry}
        <path class="line" d="M{left - 3} {y - r - 1.5}l5-2M{right + 3} {y - r - 1.5}l-5-2" />
        <path class="tear" d="M{right + 2.5} {y + r}c2 3 2 5 0 5s-2-2 0-5Z" />
        <path class="line" d="M29.5 {y + r + 2}q2.5-2 5 0" />
      {:else}
        <path class="line" d="M29.5 {y + r * 0.7}q1.25 1.6 2.5 0q1.25 1.6 2.5 0" />
      {/if}
    </g>
  </svg>
  <figcaption>
    <span>{t.pet.level} {pet.level}</span>
    {#if pet.toNext !== undefined}
      <progress value={pet.progress} max="1" aria-label={t.pet.toLevel(toLevel)}></progress>
    {/if}
  </figcaption>
</figure>

<style>
  figure {
    display: grid;
    flex: none;
    width: var(--pet-size);
    gap: var(--space-1);
    margin: 0;
    justify-items: center;
  }

  figure.large {
    width: var(--pet-size-large);
  }

  svg {
    width: 100%;
    height: auto;
    aspect-ratio: 1;
    fill: none;
    overflow: visible;
    stroke: var(--pet-outline);
    stroke-width: var(--pet-stroke);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .fur {
    fill: var(--pet-fur);
  }

  .dead .fur {
    fill: var(--pet-ghost);
  }

  .speck {
    fill: var(--pet-patch);
    stroke: none;
  }

  .cheek {
    fill: var(--pet-cheek);
    stroke: none;
  }

  .stem {
    stroke: var(--pet-leaf-line);
  }

  .leaf {
    fill: var(--pet-leaf);
    stroke: var(--pet-leaf-line);
  }

  .hungry .leaf {
    fill: var(--pet-leaf-dry);
  }

  .dead .leaf {
    fill: var(--pet-leaf-dead);
    stroke: var(--pet-outline);
  }

  .dead .stem {
    stroke: var(--pet-outline);
  }

  .fruit {
    fill: var(--pet-gold);
  }

  .halo {
    stroke: var(--pet-gold);
  }

  .eye {
    fill: var(--pet-ink);
    stroke: none;
  }

  .shine {
    fill: var(--pet-light);
    stroke: none;
  }

  .line {
    stroke: var(--pet-ink);
  }

  .tear {
    fill: var(--pet-tear);
    stroke: none;
  }

  .eyes,
  .creature {
    transform-box: fill-box;
    transform-origin: center bottom;
  }

  .eyes {
    transform-origin: center;
  }

  :global(:root:not([data-reduce-motion])) .eyes {
    animation: blink var(--pet-blink) infinite;
  }

  :global(:root:not([data-reduce-motion])) svg:not(.dead) .creature {
    animation: breathe var(--pet-breath) var(--ease) infinite alternate;
  }

  @keyframes blink {
    0%,
    96%,
    100% {
      transform: scaleY(1);
    }

    98% {
      transform: scaleY(0.1);
    }
  }

  @keyframes breathe {
    to {
      transform: scale(1.03, 0.97);
    }
  }

  figcaption {
    display: grid;
    width: 100%;
    gap: var(--space-1);
    color: var(--text-2);
    font-size: var(--text-size-sm);
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  progress {
    display: block;
    width: 100%;
    height: var(--space-1);
    border: 0;
    border-radius: var(--space-1);
    appearance: none;
    background: var(--surface);
    overflow: hidden;
  }

  progress::-webkit-progress-bar {
    background: var(--surface);
  }

  progress::-webkit-progress-value {
    background: var(--accent);
  }

  progress::-moz-progress-bar {
    background: var(--accent);
  }
</style>
