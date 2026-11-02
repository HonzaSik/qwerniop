<script lang="ts">
import { petStatus } from "../pet-status";
import { readSessions, ui } from "../state.svelte";
import { tp } from "../strings/pet";
import Pet from "./Pet.svelte";

const status = readSessions().then((records) => petStatus(records, Date.now()));
const name = $derived(ui.settings.petName || tp.unnamed);
</script>

{#await status then status}
  {#if status}
    <aside>
      <Pet pet={status.pet} />
      <p>{status.streak.current >= 2 ? tp.streak(name, status.streak.current) : tp.greeting(status.pet, name)}</p>
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
