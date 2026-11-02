<script lang="ts">
import type { PetState } from "../../core/stats/pet";
import type { Streak } from "../../core/stats/practice";
import { ui } from "../state.svelte";
import { tp } from "../strings/pet";
import Pet from "./Pet.svelte";

interface Props {
  pet: PetState;
  streak: Streak;
}

let { pet, streak }: Props = $props();

const name = $derived(ui.settings.petName || tp.unnamed);
</script>

<div class="pet">
  <Pet {pet} />
  <div>
    <p>{streak.current >= 2 ? tp.streak(name, streak.current) : tp.status(pet, name)}</p>
    {#if streak.best >= 2}<p class="best">{tp.best(streak.best)}</p>{/if}
  </div>
</div>

<style>
  .pet {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-top: var(--space-6);
  }

  p {
    margin: 0;
    font-size: var(--text-size-sm);
  }

  .best {
    margin-top: var(--space-1);
    color: var(--text-2);
    font-variant-numeric: tabular-nums;
  }

  /* Out of the way in the corner the Practice greeting uses; narrower, it closes the page instead. */
  @media (width >= 1100px) {
    .pet {
      position: fixed;
      bottom: var(--space-5);
      left: var(--space-5);
      display: grid;
      width: var(--pet-greeting-width);
      justify-items: center;
      gap: var(--space-2);
      margin: 0;
      text-align: center;
      pointer-events: none;
    }
  }
</style>
