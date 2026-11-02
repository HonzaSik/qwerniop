<script lang="ts">
import { PET_STAGES, type PetStage, type PetState } from "../../core/stats/pet";
import { ui } from "../state.svelte";
import { t } from "../strings";

interface Props {
  pet: PetState;
  large?: boolean;
}

let { pet, large = false }: Props = $props();

const BOTTOM = 57;
const dead = $derived(pet.mood === "dead");
const atLeast = (stage: PetStage): boolean =>
  PET_STAGES.indexOf(pet.stage) >= PET_STAGES.indexOf(stage);

// Grows a little at every level, not only at a new stage, so each one shows on the pet.
const grown = $derived((pet.level - 1) / 19);
const half = $derived((pet.stage === "egg" ? 13 : 15) + 9 * grown);
const top = $derived(27 - 11 * grown);
const stem = $derived(2 + 5 * grown);
const leafSize = $derived(0.5 + 0.5 * grown);
const height = $derived(BOTTOM - top);
const hatching = $derived(pet.stage === "hatchling");
const y = $derived(top + height * (hatching && !dead ? 0.46 : 0.6));
const r = $derived(half * 0.25);
const left = $derived(32 - half * 0.5);
const right = $derived(32 + half * 0.5);
const stemTop = $derived(top - stem);
const hungry = $derived(pet.mood === "hungry");
const asleep = $derived(pet.stage === "egg" && pet.mood === "content");
// Leaves hang lower the longer it goes unfed, so the sprout shows its mood too.
const droop = $derived(dead ? 62 : hungry ? 28 : 0);

const eggPath = (t0: number, w: number, b: number, dx = 0): string => {
  const h = b - t0;
  const c = 32 + dx;
  const at = (share: number): number => t0 + h * share;
  const side = w * 0.58;
  return `M${c} ${t0}C${c + side} ${t0} ${c + w} ${at(0.32)} ${c + w} ${at(0.6)}C${c + w} ${at(0.86)} ${c + side} ${b} ${c} ${b}C${c - side} ${b} ${c - w} ${at(0.86)} ${c - w} ${at(0.6)}C${c - w} ${at(0.32)} ${c - side} ${t0} ${c} ${t0}Z`;
};
const body = $derived(eggPath(top, half, BOTTOM));
// A second, smaller egg over the first leaves a shaded edge without a gradient.
const lit = $derived(eggPath(top + 0.8, half - 1.6, BOTTOM - 3, -0.8));

const shell = $derived.by(() => {
  const edge = top + height * 0.68;
  const w = half + 1;
  const step = (w * 2) / 6;
  const zigzag = Array.from(
    { length: 6 },
    (_, i) =>
      `L${32 - w + step * (i + 0.5)} ${edge + (i % 2 === 0 ? -4 : 2)}L${32 - w + step * (i + 1)} ${edge}`,
  ).join("");
  return `M${32 - w} ${edge}${zigzag}C${32 + w} ${BOTTOM - 3} ${32 + w * 0.6} ${BOTTOM + 1} 32 ${BOTTOM + 1}C${32 - w * 0.6} ${BOTTOM + 1} ${32 - w} ${BOTTOM - 3} ${32 - w} ${edge}Z`;
});

interface Leaf {
  x: number;
  y: number;
  turn: number;
  size: number;
}

const CROWN: Record<PetStage, number> = {
  egg: 1,
  hatchling: 2,
  seedling: 2,
  sprout: 3,
  sapling: 4,
  bush: 5,
  bloom: 6,
  guardian: 7,
};

// A tidy fan, outer leaves drawn first and shorter: leaves at random angles read as a heap.
const leaves = $derived.by((): Leaf[] => {
  const count = CROWN[pet.stage];
  if (count === 1) {
    return [{ x: 32, y: stemTop, turn: 28 + droop, size: leafSize }];
  }
  const spread = count === 2 ? 48 : 76;
  return Array.from(
    { length: count },
    (_, i) => -spread + (2 * spread * i) / (count - 1),
  )
    .sort((a, b) => Math.abs(b) - Math.abs(a))
    .map((angle) => ({
      x: 32,
      y: stemTop,
      // A dead crown flops to one side, or its middle leaf would still stand up.
      turn: angle + (angle / spread) * droop + (dead && count > 2 ? 34 : 0),
      size:
        leafSize * (count === 2 ? 1 : 1 - 0.22 * (Math.abs(angle) / spread)),
    }));
});
// Little leaves at the sides of the head, like ears.
const earLeaves = $derived.by((): Leaf[] => {
  if (!atLeast("bush")) return [];
  const y = top + height * 0.2;
  const size = leafSize * 0.6;
  return [
    { x: 32 - half * 0.72, y, turn: -58 - droop, size },
    { x: 32 + half * 0.72, y, turn: 58 + droop, size },
  ];
});

const leafPath = (s: number): string =>
  `M0 0C${-5.5 * s} ${-3 * s} ${-6.5 * s} ${-10 * s} 0 ${-15 * s}C${6.5 * s} ${-10 * s} ${5.5 * s} ${-3 * s} 0 0Z`;
const leafShade = (s: number): string =>
  `M0 0C${5.5 * s} ${-3 * s} ${6.5 * s} ${-10 * s} 0 ${-15 * s}Z`;

const PETALS = [0, 72, 144, 216, 288];

const haloY = $derived(stemTop - (atLeast("sprout") ? 6 + 12 * leafSize : 8));
const toLevel = $derived(pet.level + 1);
</script>

<figure class:large>
  <svg class:dead class:hungry viewBox="-6 -14 76 76" role="img" aria-label={t.pet.label(pet, ui.settings.petName || t.pet.unnamed)}>
    <ellipse class="ground" cx="32" cy={BOTTOM + 3} rx={half * 0.95} ry="2.4" />
    <g class="creature">
      <!-- Slumped where it sat: tipped over it read as a thing, not a pet. -->
      <g transform={dead ? `rotate(-7 32 ${BOTTOM})` : undefined}>
        <path class="stem-edge" d="M32 {top + 1}V{stemTop}" />
        <path class="stem" d="M32 {top + 1}V{stemTop}" />
        {#each [...leaves, ...earLeaves] as leaf}
          <g transform="translate({leaf.x} {leaf.y}) rotate({leaf.turn})">
            <path class="leaf" d={leafPath(leaf.size)} />
            <path class="leaf-shade" d={leafShade(leaf.size)} />
            <path class="vein" d="M0 {-2 * leaf.size}V{-11 * leaf.size}" />
          </g>
        {/each}
        {#if pet.stage === "bloom"}
          {#each PETALS as angle}
            <circle class="petal" cx={32 + Math.cos((angle * Math.PI) / 180) * 3.2} cy={stemTop - 3 + Math.sin((angle * Math.PI) / 180) * 3.2} r="2.2" />
          {/each}
          <circle class="fruit" cx="32" cy={stemTop - 3} r="2" />
        {:else if pet.stage === "guardian"}
          <circle class="fruit" cx="32" cy={stemTop - 3} r="4.5" />
          <circle class="fruit-shine" cx="30.6" cy={stemTop - 4.6} r="1.2" />
        {/if}

        {#if atLeast("seedling")}
          <ellipse class="fur" cx={32 - half * 0.45} cy={BOTTOM + 1} rx={half * 0.28} ry="3" />
          <ellipse class="fur" cx={32 + half * 0.45} cy={BOTTOM + 1} rx={half * 0.28} ry="3" />
        {/if}
        {#if atLeast("sprout")}
          <ellipse class="fur" cx={32 - half} cy={y + 6} rx={half * 0.16} ry={half * 0.25} transform="rotate(18 {32 - half} {y + 6})" />
          <ellipse class="fur" cx={32 + half} cy={y + 6} rx={half * 0.16} ry={half * 0.25} transform="rotate(-18 {32 + half} {y + 6})" />
        {/if}
        <path class="shade" d={body} />
        <path class="fur plain" d={lit} />
        <path class="edge" d={body} />
        <ellipse class="gloss" cx={32 - half * 0.45} cy={top + height * 0.2} rx={half * 0.17} ry={half * 0.11} transform="rotate(-30 {32 - half * 0.45} {top + height * 0.2})" />
        <circle class="speck" cx={32 + half * 0.55} cy={top + height * 0.3} r={half * 0.08} />
        <circle class="speck" cx={32 + half * 0.68} cy={top + height * 0.45} r={half * 0.05} />
        {#if pet.level === 2}<path class="edge" d="M{32 - half * 0.4} {top + height * 0.2}l2.5 2.5 2-3 2.5 2.5" />{/if}

        {#if !dead}
          <ellipse class="cheek" cx={left - r * 0.7} cy={y + r + 1} rx={half * 0.18} ry={half * 0.11} /><ellipse class="cheek" cx={right + r * 0.7} cy={y + r + 1} rx={half * 0.18} ry={half * 0.11} />
        {/if}
        {#if dead}
          {#each [left, right] as x}
            <path class="line" d="M{x - r * 0.8} {y - r * 0.8}l{r * 1.6} {r * 1.6}m0-{r * 1.6}l-{r * 1.6} {r * 1.6}" />
          {/each}
          <path class="line" d="M26 {y + r + 1.5}h12" />
          <ellipse class="tongue" cx="32" cy={y + r + 3.6} rx="3.2" ry="3" />
        {:else if asleep}
          {#each [left, right] as x}
            <path class="line" d="M{x - r} {y}q{r} {r} {r * 2} 0" />
          {/each}
        {:else}
          <g class="eyes">
            {#each [left, right] as x}
              <circle class="eye" cx={x} cy={y} {r} />
              <circle class="shine" cx={x + r * 0.35} cy={y - r * 0.4} r={r * 0.36} />
              <circle class="shine" cx={x - r * 0.35} cy={y + r * 0.4} r={r * (hungry ? 0.26 : 0.17)} />
            {/each}
          </g>
        {/if}
        {#if hungry}
          <path class="line" d="M{left - 3} {y - r - 1.5}l5-2M{right + 3} {y - r - 1.5}l-5-2" />
          <path class="tear" d="M{right + 2.5} {y + r}c2 3 2 5 0 5s-2-2 0-5Z" />
          <path class="line" d="M29.5 {y + r + 2}q2.5-2 5 0" />
        {:else if !dead}
          <path class="line" d="M29.5 {y + r * 0.7}q1.25 1.6 2.5 0q1.25 1.6 2.5 0" />
        {/if}
        {#if hatching && !dead}<path class="eggshell" d={shell} />{/if}
      </g>
      {#if dead}<ellipse class="halo" cx="32" cy={haloY} rx="8" ry="2.2" />{/if}
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

  .ground {
    fill: var(--pet-ink);
    stroke: none;
    opacity: var(--pet-ground-opacity);
  }

  .fur {
    fill: var(--pet-fur);
  }

  .plain,
  .edge {
    stroke: none;
  }

  .edge {
    fill: none;
    stroke: var(--pet-outline);
  }

  .shade {
    fill: var(--pet-shade);
    stroke: none;
  }

  .gloss {
    fill: var(--pet-light);
    stroke: none;
    opacity: var(--pet-gloss-opacity);
  }

  .speck {
    fill: var(--pet-patch);
    stroke: none;
  }

  .cheek {
    fill: var(--pet-cheek);
    stroke: none;
  }

  .stem-edge {
    stroke: var(--pet-leaf-line);
    stroke-width: calc(var(--pet-stroke) * 2);
  }

  .stem {
    stroke: var(--pet-leaf);
    stroke-width: var(--pet-stroke);
  }

  .leaf {
    fill: var(--pet-leaf);
    stroke: var(--pet-leaf-line);
  }

  .leaf-shade {
    fill: var(--pet-leaf-line);
    stroke: none;
    opacity: var(--pet-leaf-shade-opacity);
  }

  .vein {
    stroke: var(--pet-leaf-line);
    stroke-width: calc(var(--pet-stroke) / 2);
  }

  .hungry .leaf {
    fill: var(--pet-leaf-dry);
  }

  .eggshell {
    fill: var(--pet-shell);
  }

  .petal {
    fill: var(--pet-light);
    stroke-width: calc(var(--pet-stroke) / 2);
    stroke: var(--pet-patch);
  }

  .fruit {
    fill: var(--pet-gold);
  }

  .fruit-shine {
    fill: var(--pet-light);
    stroke: none;
  }

  .tongue {
    fill: var(--pet-tongue);
    stroke: var(--pet-ink);
  }

  .dead {
    stroke: var(--pet-dead-line);
  }

  .dead .fur {
    fill: var(--pet-ghost);
  }

  .dead .shade {
    fill: var(--pet-dead-shade);
  }

  .dead .edge,
  .dead .stem-edge,
  .dead .vein,
  .dead .leaf {
    stroke: var(--pet-dead-line);
  }

  .dead .stem,
  .dead .leaf {
    fill: var(--pet-leaf-dead);
  }

  .dead .stem {
    stroke: var(--pet-leaf-dead);
  }

  .dead .speck {
    fill: var(--pet-dead-line);
    opacity: var(--pet-dead-speck);
  }

  .dead .eggshell {
    fill: var(--pet-ghost);
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
