<script lang="ts">
import { petState } from "../../core/stats/pet";
import { practiceByDay } from "../../core/stats/practice";
import { readSessions, ui } from "../state.svelte";
import { tp } from "../strings/pet";
import Pet from "./Pet.svelte";

const pet = readSessions().then((records) =>
  petState(practiceByDay(records), Date.now()),
);
</script>

{#await pet then pet}
  {#if pet}
    <aside>
      <Pet {pet} />
      <p>{tp.greeting(pet, ui.settings.petName || tp.unnamed)}</p>
    </aside>
  {/if}
{/await}

<style>
  /* Out of the flow, so the text does not jump when it goes at the first key. */
  aside {
    position: fixed;
    bottom: var(--space-5);
    left: var(--space-5);
    display: grid;
    width: var(--pet-greeting-width);
    gap: var(--space-2);
    justify-items: center;
    pointer-events: none;
  }

  p {
    margin: 0;
    color: var(--text-2);
    font-size: var(--text-size-sm);
    text-align: center;
  }

  /* No free corner beside the keyboard on a narrow window. */
  @media (width < 1100px) {
    aside {
      display: none;
    }
  }
</style>
