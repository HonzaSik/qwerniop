<script lang="ts">
import {
  BOW_LEVEL,
  CROWN_LEVEL,
  type PetState,
  SCARF_LEVEL,
} from "../../core/stats/pet";
import { t } from "../strings";

interface Props {
  pet: PetState;
  large?: boolean;
}

let { pet, large = false }: Props = $props();

const FACE = {
  egg: { y: 37, apart: 7, r: 2.6 },
  baby: { y: 41, apart: 7, r: 3.2 },
  child: { y: 36, apart: 8, r: 3.6 },
  teen: { y: 31, apart: 8, r: 3.6 },
  adult: { y: 28, apart: 9, r: 3.8 },
} as const;
const face = $derived(FACE[pet.stage]);
const left = $derived(32 - face.apart);
const right = $derived(32 + face.apart);
const sides = $derived([left, right]);
const dead = $derived(pet.mood === "dead");
const hungry = $derived(pet.mood === "hungry");
const grown = $derived(pet.stage !== "egg" && pet.stage !== "baby");
const headTop = $derived(
  pet.stage === "adult" ? 11 : pet.stage === "teen" ? 14 : 19,
);
// Above whatever is on the head, so nothing hides it.
const haloY = $derived(
  pet.level >= CROWN_LEVEL
    ? -1
    : pet.stage === "egg"
      ? 2
      : pet.stage === "baby"
        ? 5
        : Math.max(5, headTop - 8),
);
const toLevel = $derived(pet.level + 1);
</script>

<figure class:large>
  <svg class:dead viewBox="0 0 64 64" role="img" aria-label={t.pet.label(pet)}>
    <g class="creature">
      {#if dead}<ellipse class="halo" cx="32" cy={haloY} rx="9" ry="2.5" />{/if}

      {#if pet.stage === "teen" || pet.stage === "adult"}
        <path class="body" d="M50 {pet.stage === 'adult' ? 48 : 50}c7 1 10-4 7-8-2-2-5-1-5 1" />
      {/if}
      {#if pet.stage === "child"}
        <circle class="body" cx="16" cy="22" r="6.5" /><circle class="body" cx="48" cy="22" r="6.5" />
        <circle class="inner" cx="16" cy="22" r="3" /><circle class="inner" cx="48" cy="22" r="3" />
      {:else if pet.stage === "teen"}
        <ellipse class="body" cx="20" cy="15" rx="5.5" ry="11" transform="rotate(-12 20 15)" />
        <ellipse class="body" cx="44" cy="15" rx="5.5" ry="11" transform="rotate(12 44 15)" />
        <ellipse class="inner" cx="20" cy="15" rx="2.5" ry="7" transform="rotate(-12 20 15)" />
        <ellipse class="inner" cx="44" cy="15" rx="2.5" ry="7" transform="rotate(12 44 15)" />
      {:else if pet.stage === "adult"}
        <circle class="body" cx="13" cy="14" r="8.5" /><circle class="body" cx="51" cy="14" r="8.5" />
        <circle class="inner" cx="13" cy="14" r="4.5" /><circle class="inner" cx="51" cy="14" r="4.5" />
      {/if}

      {#if grown || pet.stage === "baby"}
                <ellipse class="body" cx="23" cy="58" rx="6" ry="3.8" /><ellipse class="body" cx="41" cy="58" rx="6" ry="3.8" />
      {/if}
      {#if grown}
        <ellipse class="body" cx={pet.stage === "adult" ? 9 : 12} cy="42" rx="3.6" ry="5.5" transform="rotate(20 {pet.stage === 'adult' ? 9 : 12} 42)" />
        <ellipse class="body" cx={pet.stage === "adult" ? 55 : 52} cy="42" rx="3.6" ry="5.5" transform="rotate(-20 {pet.stage === 'adult' ? 55 : 52} 42)" />
      {/if}

      {#if pet.stage === "egg"}
        <path class="body" d="M32 7C42 7 50 23 50 37C50 50 42 58 32 58C22 58 14 50 14 37C14 23 22 7 32 7Z" />
        <circle class="spot" cx="24" cy="24" r="3" /><circle class="spot" cx="41" cy="27" r="2.2" /><circle class="spot" cx="39" cy="50" r="2.6" /><circle class="spot" cx="22" cy="49" r="2" />
      {:else if pet.stage === "baby"}
        <path d="M32 25c0-4 0-6 1-9" />
        <path class="leaf" d="M33 17c-6 0-9-3-10-7 6-1 10 2 10 7Z" /><path class="leaf" d="M33 17c5-1 8-4 8-8-5 0-8 3-8 8Z" />
        <circle class="body" cx="32" cy="41" r="17" />
      {:else if pet.stage === "child"}
        <ellipse class="body" cx="32" cy="37" rx="20" ry="19" />
        <ellipse class="belly" cx="32" cy="47" rx="10" ry="7" />
      {:else if pet.stage === "teen"}
        <ellipse class="body" cx="32" cy="35" rx="19" ry="21" />
        <ellipse class="belly" cx="32" cy="46" rx="10" ry="8" />
      {:else}
        <ellipse class="body" cx="32" cy="33" rx="22" ry="23" />
        <ellipse class="belly" cx="32" cy="45" rx="12" ry="9" />
      {/if}

      {#if pet.level >= SCARF_LEVEL && (pet.stage === "teen" || pet.stage === "adult")}
        {@const wide = pet.stage === "adult" ? 21 : 18}
        <path class="ribbon" d="M{32 - wide} 39q{wide} 8 {wide * 2} 0v3q-{wide} 9-{wide * 2} 0Z" />
        <path class="ribbon" d="M40 44l2 9 5-2-2-8Z" />
      {/if}
      {#if pet.level >= CROWN_LEVEL}
        <path class="crown" d="M23 12l-1-9 6 4 4-6 4 6 6-4-1 9Z" />
      {:else if pet.level >= BOW_LEVEL && grown}
        <path class="ribbon" d="M32 {headTop + 2}l-8-4v8ZM32 {headTop + 2}l8-4v8Z" />
        <circle class="ribbon" cx="32" cy={headTop + 2} r="2" />
      {/if}

      {#if !dead}
        <ellipse class="cheek" cx={left - 4} cy={face.y + 5} rx="3.2" ry="2" /><ellipse class="cheek" cx={right + 4} cy={face.y + 5} rx="3.2" ry="2" />
      {/if}
      {#if dead}
        {#each sides as x}<path d="M{x - 2.4} {face.y - 2.4}l4.8 4.8m0-4.8l-4.8 4.8" />{/each}
        <path d="M29 {face.y + 7}h6" />
      {:else if pet.stage === "egg" && !hungry}
        {#each sides as x}<path d="M{x - 3} {face.y}q3 3 6 0" />{/each}
        <path d="M30 {face.y + 5}q2 2 4 0" />
      {:else}
        <g class="eyes">
          {#each sides as x}
            <circle class="eye" cx={x} cy={face.y} r={face.r} />
            <circle class="shine" cx={x + 1} cy={face.y - 1.2} r={face.r * 0.32} />
          {/each}
        </g>
        {#if hungry}
          <path d="M{left - 4} {face.y - 4}l5-2M{right + 4} {face.y - 4}l-5-2" />
          <path class="tear" d="M{right + 3} {face.y + 3}c2 3 2 5 0 5s-2-2 0-5Z" />
          <path d="M29 {face.y + 8}q3-3 6 0" />
        {:else}
          <path d="M29 {face.y + 5}q3 3.5 6 0" />
        {/if}
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
    stroke: var(--pet-ink);
    stroke-width: var(--pet-stroke);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .body {
    fill: color-mix(in srgb, var(--accent) var(--pet-fill-mix), var(--pet-light));
  }

  .dead .body {
    fill: var(--pet-ghost);
  }

  .belly,
  .spot {
    fill: var(--pet-light);
    stroke: none;
    opacity: var(--pet-soft-opacity);
  }

  .inner,
  .cheek {
    fill: var(--pet-cheek);
    stroke: none;
  }

  .leaf {
    fill: var(--pet-leaf);
  }

  .ribbon {
    fill: var(--pet-cheek-strong);
  }

  .crown {
    fill: var(--pet-gold);
  }

  .tear {
    fill: var(--pet-tear);
    stroke: none;
  }

  .halo {
    fill: none;
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
