<script lang="ts">
import {
  CROWN_LEVEL,
  HAT_LEVEL,
  type PetState,
  TIE_LEVEL,
} from "../../core/stats/pet";
import { t } from "../strings";

interface Props {
  pet: PetState;
  large?: boolean;
}

let { pet, large = false }: Props = $props();

const FACE = {
  egg: { y: 33, apart: 7, r: 4 },
  baby: { y: 39, apart: 7.5, r: 4.4 },
  child: { y: 33, apart: 8.5, r: 5 },
  teen: { y: 28, apart: 8.5, r: 5 },
  adult: { y: 25, apart: 10, r: 5.4 },
} as const;
const face = $derived(FACE[pet.stage]);
const left = $derived(32 - face.apart);
const right = $derived(32 + face.apart);
const mouth = $derived(face.y + face.r + 2);
const dead = $derived(pet.mood === "dead");
const hungry = $derived(pet.mood === "hungry");
const grown = $derived(pet.stage !== "egg" && pet.stage !== "baby");
const headTop = $derived(
  pet.stage === "adult" ? 11 : pet.stage === "teen" ? 14 : 19,
);
const armX = $derived(pet.stage === "adult" ? 8 : 12);
const tieY = $derived(pet.stage === "adult" ? 41 : 44);
// Above whatever is on the head, so nothing hides it.
const haloY = $derived(
  pet.level >= CROWN_LEVEL
    ? -3
    : pet.level >= HAT_LEVEL && grown
      ? headTop - 15
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
        <path class="tail" d="M50 48c7 1 10-4 7-8" />
      {/if}
      <!-- Lopsided on purpose: nothing about this creature quite matches. -->
      {#if pet.stage === "child"}
        <circle class="body" cx="15" cy="22" r="7" /><circle class="body" cx="49" cy="24" r="5" />
      {:else if pet.stage === "teen"}
        <ellipse class="body" cx="21" cy="13" rx="5" ry="11" transform="rotate(-10 21 13)" />
        <ellipse class="body" cx="50" cy="20" rx="11" ry="5" transform="rotate(22 50 20)" />
      {:else if pet.stage === "adult"}
        <circle class="body" cx="12" cy="13" r="8.5" /><circle class="body" cx="53" cy="16" r="6" />
      {/if}

      {#if pet.stage !== "egg"}
        <ellipse class="body" cx="22" cy="58" rx="7" ry="3.8" /><ellipse class="body" cx="42" cy="58" rx="7" ry="3.8" transform="rotate(8 42 58)" />
      {/if}
      {#if grown}
        <ellipse class="body" cx={armX} cy="42" rx="3.6" ry="5.5" transform="rotate(25 {armX} 42)" />
        <ellipse class="body" cx={64 - armX} cy="38" rx="3.6" ry="5.5" transform="rotate(-35 {64 - armX} 38)" />
      {/if}

      {#if pet.stage === "egg"}
        <path class="body" d="M32 7C42 7 50 23 50 37C50 50 42 58 32 58C22 58 14 50 14 37C14 23 22 7 32 7Z" />
        <path d="M24 13l3 3 3-3 3 3" />
        <circle class="spot" cx="41" cy="23" r="2.2" /><circle class="spot" cx="40" cy="51" r="2.6" /><circle class="spot" cx="21" cy="49" r="2" />
      {:else if pet.stage === "baby"}
        <path d="M32 25c0-4-1-6 1-9" />
        <path class="leaf" d="M33 16c5-1 9 1 11 6-6 1-10-1-11-6Z" />
        <circle class="body" cx="32" cy="41" r="17" />
      {:else if pet.stage === "child"}
        <ellipse class="body" cx="32" cy="37" rx="21" ry="19" />
        <ellipse class="belly" cx="32" cy="49" rx="11" ry="6" />
      {:else if pet.stage === "teen"}
        <ellipse class="body" cx="32" cy="35" rx="20" ry="21" />
        <ellipse class="belly" cx="32" cy="48" rx="11" ry="7" />
      {:else}
        <ellipse class="body" cx="32" cy="33" rx="23" ry="23" />
        <ellipse class="belly" cx="32" cy="47" rx="13" ry="8" />
      {/if}

      {#if pet.level >= TIE_LEVEL && (pet.stage === "teen" || pet.stage === "adult")}
        <path class="tie" d="M32 {tieY}l-3 2 2 2-2 8 4 3 4-4-3-7 2-2Z" transform="rotate(12 32 {tieY})" />
      {/if}
      {#if pet.level >= CROWN_LEVEL}
        <path class="crown" d="M22 13l-1-10 6 4 5-6 5 6 6-4-1 10Z" transform="rotate(-12 32 8)" />
      {:else if pet.level >= HAT_LEVEL && grown}
        <g transform="rotate(-10 32 {headTop})">
          <path d="M32 {headTop - 6}v-5" />
          <path class="tie" d="M23 {headTop + 3}a9 9 0 0 1 18 0Z" />
          <ellipse class="crown" cx="27" cy={headTop - 11} rx="5" ry="1.6" /><ellipse class="crown" cx="37" cy={headTop - 11} rx="5" ry="1.6" />
        </g>
      {/if}

      {#if dead}
        {#each [left, right] as x}
          <path d="M{x - 3} {face.y - 3}l6 6m0-6l-6 6" />
        {/each}
        <path d="M27 {mouth}h10" />
        <ellipse class="tongue" cx="35" cy={mouth + 3} rx="2.6" ry="3.2" />
      {:else}
        <g class="eyes">
          <circle class="eye" cx={left} cy={face.y} r={face.r + 0.8} />
          <circle class="eye" cx={right} cy={face.y} r={face.r - 0.3} />
          {#if hungry}
            <circle class="pupil" cx={left} cy={face.y + face.r * 0.5} r={face.r * 0.42} />
            <circle class="pupil" cx={right} cy={face.y + face.r * 0.4} r={face.r * 0.42} />
          {:else}
            <!-- Slightly cross-eyed, which is most of the joke. -->
            <circle class="pupil" cx={left + face.r * 0.4} cy={face.y + face.r * 0.25} r={face.r * 0.42} />
            <circle class="pupil" cx={right - face.r * 0.35} cy={face.y - face.r * 0.2} r={face.r * 0.42} />
          {/if}
        </g>
        {#if hungry}
          <path d="M27 {mouth + 1}q2.5-2.5 5 0t5 0" />
          <ellipse class="tongue" cx="29" cy={mouth + 3.5} rx="2.2" ry="2.8" />
          <path class="drool" d="M36 {mouth + 2}c2 3 2 5 0 5s-2-2 0-5Z" />
        {:else}
          <path class="grin" d="M23 {mouth}q9 11 18-1Z" />
          <rect class="tooth" x="27" y={mouth} width="3.4" height="3" />
          <ellipse class="tongue" cx="35" cy={mouth + 3.5} rx="3" ry="2.2" />
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

  .leaf {
    fill: var(--pet-leaf);
  }

  /* In the body colour: an ink line alone would vanish on a dark page. */
  .tail {
    stroke: color-mix(in srgb, var(--accent) var(--pet-fill-mix), var(--pet-light));
    stroke-width: calc(var(--pet-stroke) * 2.5);
  }

  .dead .tail {
    stroke: var(--pet-ghost);
  }

  .tie {
    fill: var(--pet-tie);
  }

  .crown {
    fill: var(--pet-gold);
  }

  .halo {
    fill: none;
    stroke: var(--pet-gold);
  }

  .eye,
  .tooth {
    fill: var(--pet-light);
  }

  .pupil,
  .grin {
    fill: var(--pet-ink);
    stroke: none;
  }

  .tooth {
    stroke: none;
  }

  .tongue {
    fill: var(--pet-tongue);
  }

  .drool {
    fill: var(--pet-drool);
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
