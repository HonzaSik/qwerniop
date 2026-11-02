<script lang="ts">
import {
  BANDANA_LEVEL,
  BEANIE_LEVEL,
  CROWN_LEVEL,
  type PetState,
} from "../../core/stats/pet";
import { t } from "../strings";

interface Props {
  pet: PetState;
  large?: boolean;
}

let { pet, large = false }: Props = $props();

// Eyes sit low and wide on a big head: that is most of what reads as young and sweet.
const SHAPE = {
  egg: { y: 38, apart: 7, r: 3.6, top: 7, neck: 0 },
  baby: { y: 40, apart: 9, r: 4.6, top: 17, neck: 0 },
  child: { y: 36, apart: 10, r: 4.8, top: 14, neck: 51 },
  teen: { y: 30, apart: 10, r: 4.8, top: 10, neck: 44 },
  adult: { y: 26, apart: 10.5, r: 5, top: 6, neck: 40 },
} as const;
const shape = $derived(SHAPE[pet.stage]);
const left = $derived(32 - shape.apart);
const right = $derived(32 + shape.apart);
const dead = $derived(pet.mood === "dead");
const hungry = $derived(pet.mood === "hungry");
const asleep = $derived(dead || (pet.stage === "egg" && !hungry));
const grown = $derived(pet.stage === "teen" || pet.stage === "adult");
const crowned = $derived(pet.level >= CROWN_LEVEL);
const beanie = $derived(pet.level >= BEANIE_LEVEL && grown && !crowned);
const haloY = $derived(shape.top - (crowned ? 9 : beanie ? 13 : 5));
const toLevel = $derived(pet.level + 1);
</script>

<figure class:large>
  <svg class:dead viewBox="0 0 64 64" role="img" aria-label={t.pet.label(pet)}>
    <g class="creature">
      {#if dead}<ellipse class="halo" cx="32" cy={haloY} rx="8" ry="2.2" />{/if}

      {#if pet.stage === "egg"}
        <path class="fur" d="M32 7C42 7 50 23 50 37C50 50 42 58 32 58C22 58 14 50 14 37C14 23 22 7 32 7Z" />
        <ellipse class="patch" cx="25" cy="20" rx="3" ry="2.2" /><ellipse class="patch" cx="40" cy="24" rx="2.2" ry="1.6" /><ellipse class="patch" cx="42" cy="49" rx="2.4" ry="1.8" />
      {:else if pet.stage === "baby"}
        <ellipse class="fur" cx="23" cy="58" rx="4.5" ry="2.8" /><ellipse class="fur" cx="41" cy="58" rx="4.5" ry="2.8" />
        <path d="M32 18c-1-3-3-4-5-4M32 18c0-3 1-5 3-6" />
        <circle class="fur" cx="32" cy="38" r="21" />
        <ellipse class="belly" cx="32" cy="52" rx="10" ry="5" />
      {:else if pet.stage === "child"}
        <circle class="fur" cx="14" cy="19" r="6" /><circle class="fur" cx="50" cy="19" r="6" />
        <circle class="patch" cx="14" cy="19" r="2.8" /><circle class="patch" cx="50" cy="19" r="2.8" />
        <ellipse class="fur" cx="32" cy="52" rx="12" ry="9" />
        <ellipse class="fur" cx="24" cy="59" rx="5" ry="3" /><ellipse class="fur" cx="40" cy="59" rx="5" ry="3" />
        <ellipse class="fur" cx="32" cy="34" rx="22" ry="20" />
      {:else if pet.stage === "teen"}
        <circle class="fur" cx="53" cy="52" r="5" />
        <circle class="fur" cx="13" cy="15" r="6.5" /><circle class="fur" cx="51" cy="15" r="6.5" />
        <circle class="patch" cx="13" cy="15" r="3" /><circle class="patch" cx="51" cy="15" r="3" />
        <ellipse class="fur" cx="32" cy="48" rx="16" ry="13" />
        <ellipse class="belly" cx="32" cy="51" rx="9" ry="8" />
        <ellipse class="fur" cx="22" cy="60" rx="5.5" ry="3" /><ellipse class="fur" cx="42" cy="60" rx="5.5" ry="3" />
        <ellipse class="fur" cx="32" cy="27" rx="22" ry="18" />
      {:else}
        <circle class="fur" cx="57" cy="50" r="5.5" />
        <circle class="fur" cx="12" cy="11" r="7" /><circle class="fur" cx="52" cy="11" r="7" />
        <circle class="patch" cx="12" cy="11" r="3.4" /><circle class="patch" cx="52" cy="11" r="3.4" />
        <ellipse class="fur" cx="32" cy="46" rx="23" ry="17" />
        <ellipse class="belly" cx="32" cy="49" rx="13" ry="11" />
        <ellipse class="fur" cx="19" cy="60" rx="7" ry="3.2" /><ellipse class="fur" cx="45" cy="60" rx="7" ry="3.2" />
        <ellipse class="fur" cx="32" cy="24" rx="23" ry="18" />
      {/if}

      {#if pet.level >= BANDANA_LEVEL && shape.neck > 0}
        <path class="worn" d="M21 {shape.neck}q11 5 22 0L32 {shape.neck + 10}Z" />
      {/if}
      {#if crowned}
        <path class="crown" d="M25 {shape.top + 2}l-1-8 4.5 3.5L32 {shape.top - 9}l3.5 6.5 4.5-3.5-1 8Z" />
      {:else if beanie}
        <circle class="worn" cx="32" cy={shape.top - 6.5} r="2.6" />
        <path class="worn" d="M21 {shape.top + 5}a11 10 0 0 1 22 0Z" />
      {/if}

      {#if !dead}
        <ellipse class="cheek" cx={left - 3} cy={shape.y + shape.r + 1} rx="3" ry="1.8" /><ellipse class="cheek" cx={right + 3} cy={shape.y + shape.r + 1} rx="3" ry="1.8" />
      {/if}
      {#if asleep}
        {#each [left, right] as x}
          <path class="lid" d="M{x - shape.r} {shape.y}q{shape.r} {shape.r} {shape.r * 2} 0" />
        {/each}
      {:else}
        <g class="eyes">
          {#each [left, right] as x}
            <circle class="eye" cx={x} cy={shape.y} r={shape.r} />
            <circle class="shine" cx={x + shape.r * 0.35} cy={shape.y - shape.r * 0.4} r={shape.r * 0.34} />
            <circle class="shine" cx={x - shape.r * 0.35} cy={shape.y + shape.r * 0.4} r={shape.r * (hungry ? 0.26 : 0.16)} />
          {/each}
        </g>
      {/if}
      {#if hungry}
        <path class="lid" d="M{left - 3} {shape.y - shape.r - 1.5}l5-2M{right + 3} {shape.y - shape.r - 1.5}l-5-2" />
        <path class="tear" d="M{right + 2.5} {shape.y + shape.r}c2 3 2 5 0 5s-2-2 0-5Z" />
      {/if}
      <ellipse class="nose" cx="32" cy={shape.y + shape.r * 0.5} rx="1.5" ry="1.1" />
      {#if hungry}
        <path class="lid" d="M29.5 {shape.y + shape.r + 1.6}q2.5-2 5 0" />
      {:else}
        <path class="lid" d="M29.5 {shape.y + shape.r * 0.5 + 2}q1.25 1.6 2.5 0q1.25 1.6 2.5 0" />
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

  .belly {
    fill: var(--pet-belly);
    stroke: none;
  }

  .patch {
    fill: var(--pet-patch);
    stroke: none;
  }

  .cheek {
    fill: var(--pet-cheek);
    stroke: none;
  }

  .worn {
    fill: color-mix(in srgb, var(--accent) var(--pet-worn-mix), var(--pet-light));
  }

  .crown {
    fill: var(--pet-gold);
  }

  .halo {
    stroke: var(--pet-gold);
  }

  .eye,
  .nose {
    fill: var(--pet-ink);
    stroke: none;
  }

  .shine {
    fill: var(--pet-light);
    stroke: none;
  }

  .lid {
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
