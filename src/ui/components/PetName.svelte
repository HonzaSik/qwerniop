<script lang="ts">
import { cleanPetName, PET_NAME_MAX } from "../../core/settings/settings";
import type { SummaryPet } from "../pet-summary";
import { saveSettings, ui } from "../state.svelte";
import { tp } from "../strings/pet";

interface Props {
  pet: SummaryPet;
  onnamed: () => void;
  /** Enter with nothing typed: naming is optional, so it moves on as Continue would. */
  onskip: () => void;
}

let { pet, onnamed, onskip }: Props = $props();

let draft = $state("");

function focusOnShow(input: HTMLInputElement): void {
  input.focus({ preventScroll: true });
}

function submit(event: SubmitEvent): void {
  event.preventDefault();
  const name = cleanPetName(draft);
  if (name === "") return;
  ui.settings.petName = name;
  saveSettings();
  onnamed();
}

// Keydown, not submit: a form whose only button is disabled never submits on Enter.
function onkeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter" || event.repeat || draft.trim() !== "") return;
  event.preventDefault();
  onskip();
}
</script>

{#if ui.settings.petName === ""}
  <form onsubmit={submit}>
    <label for="pet-name">{tp.askName(pet.state.stage === "egg")}</label>
    <div class="row">
      <input id="pet-name" type="text" bind:value={draft} maxlength={PET_NAME_MAX} autocomplete="off" spellcheck="false" {onkeydown} use:focusOnShow />
      <button type="submit" disabled={draft.trim() === ""}>{tp.giveName}</button>
    </div>
    <p class="once">{tp.nameOnce}</p>
  </form>
{:else}
  <p>
    {pet.moment
      ? tp.moment(pet.moment, ui.settings.petName)
      : tp.status(pet.state, ui.settings.petName)}
  </p>
{/if}

<style>
  form {
    display: grid;
    gap: var(--space-2);
    color: var(--text-2);
    font-size: var(--text-size-md);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  p {
    margin: 0;
    color: var(--text-2);
    font-size: var(--text-size-md);
  }

  .once {
    font-size: var(--text-size-sm);
  }
</style>
