<script lang="ts">
import type { PetMood, PetStage } from "../../core/stats/pet";
import { t } from "../strings";

interface Props {
  stage: PetStage;
  mood: PetMood;
}

let { stage, mood }: Props = $props();

const FACE: Record<PetStage, { y: number; apart: number }> = {
  egg: { y: 34, apart: 6 },
  baby: { y: 40, apart: 5 },
  child: { y: 34, apart: 6 },
  teen: { y: 28, apart: 6 },
  adult: { y: 26, apart: 7 },
};
const face = $derived(FACE[stage]);
// An unhatched egg has no face until something is wrong with it.
const showFace = $derived(stage !== "egg" || mood !== "content");
</script>

<svg class:dead={mood === "dead"} viewBox="0 0 64 64" role="img" aria-label={t.pet.label(stage, mood)}>
  {#if stage === "egg"}
    <ellipse class="body" cx="32" cy="36" rx="16" ry="21" />
    {#if mood === "content"}<path d="M24 30l4 3 4-3 4 3 4-3" />{/if}
  {:else if stage === "baby"}
    <circle class="body" cx="32" cy="44" r="14" />
    <path d="M32 30c-1-3 1-5 3-6" />
  {:else if stage === "child"}
    <path d="M24 53v7M40 53v7" />
    <circle class="body" cx="32" cy="38" r="18" />
  {:else if stage === "teen"}
    <path d="M25 54v8M39 54v8M21 18l-3-9 9 5M43 18l3-9-9 5" />
    <ellipse class="body" cx="32" cy="36" rx="17" ry="22" />
  {:else}
    <path d="M24 51v9M40 51v9M12 34l-6 8M52 34l6 8M19 15l-4-11 11 6M45 15l4-11-11 6" />
    <ellipse class="body" cx="32" cy="32" rx="20" ry="22" />
  {/if}
  {#if showFace}
    {#if mood === "dead"}
      {#each [-face.apart, face.apart] as x}
        <path d="M{32 + x - 2} {face.y - 2}l4 4m0-4l-4 4" />
      {/each}
      <path d="M28 {face.y + 7}h8" />
    {:else if mood === "hungry"}
      {#each [-face.apart, face.apart] as x}
        <path d="M{32 + x - 2} {face.y}h4" />
      {/each}
      <path d="M28 {face.y + 8}q4-4 8 0" />
    {:else}
      <g class="eyes">
        {#each [-face.apart, face.apart] as x}
          <circle cx={32 + x} cy={face.y} r="1.5" />
        {/each}
      </g>
      <path d="M28 {face.y + 5}q4 4 8 0" />
    {/if}
  {/if}
</svg>

<style>
  svg {
    flex: none;
    width: var(--pet-size);
    height: var(--pet-size);
    fill: none;
    stroke: var(--text);
    stroke-width: var(--pet-stroke);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .body {
    fill: color-mix(in srgb, var(--accent) var(--pet-fill-mix), var(--surface));
  }

  .dead .body {
    fill: var(--surface);
  }

  .eyes circle {
    fill: var(--text);
    stroke: none;
  }

  .eyes {
    transform-box: fill-box;
    transform-origin: center;
  }

  :global(:root:not([data-reduce-motion])) .eyes {
    animation: blink var(--pet-blink) infinite;
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
</style>
