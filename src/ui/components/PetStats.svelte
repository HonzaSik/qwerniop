<script lang="ts">
import { cleanPetName, PET_NAME_MAX } from "../../core/settings/settings";
import type { PetState } from "../../core/stats/pet";
import { saveSettings, ui } from "../state.svelte";
import { t } from "../strings";
import Pet from "./Pet.svelte";

interface Props {
  pet: PetState;
}

let { pet }: Props = $props();

const saveName = (event: Event & { currentTarget: HTMLInputElement }): void => {
  ui.settings.petName = cleanPetName(event.currentTarget.value);
  // A blank entry fell back to the default, so the box has to show that too.
  event.currentTarget.value = ui.settings.petName;
  saveSettings();
};

const lastPractised = $derived(
  new Intl.DateTimeFormat(t.language, { day: "numeric", month: "long" }).format(
    new Date(
      Number(pet.lastPractised.slice(0, 4)),
      Number(pet.lastPractised.slice(5, 7)) - 1,
      Number(pet.lastPractised.slice(8)),
    ),
  ),
);
const rows = $derived([
  [t.pet.stageLabel, t.pet.stages[pet.stage]],
  [t.pet.level, String(pet.level)],
  [t.pet.age, t.pet.days(pet.ageDays)],
  [t.pet.counted, `${pet.minutes} min`],
  ...(pet.toNext === undefined ? [] : [[t.pet.toNext, `${pet.toNext} min`]]),
  [t.pet.last, lastPractised],
  [t.pet.lost, String(pet.lost)],
]);
</script>

<section aria-labelledby="pet">
  <h2 id="pet">{ui.settings.petName}</h2>
  <label class="name">
    {t.pet.name}
    <input type="text" value={ui.settings.petName} maxlength={PET_NAME_MAX} autocomplete="off" spellcheck="false" onchange={saveName} />
  </label>
  <div class="row">
    <Pet {pet} large />
    <table>
      <tbody>
        {#each rows as [name, value]}
          <tr>
            <th scope="row">{name}</th>
            <td>{value}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="note">{t.pet.status(pet, ui.settings.petName)}</p>
  <p class="note">{t.pet.note(ui.settings.petName)}</p>
</section>

<style>
  section {
    margin-bottom: var(--space-7);
  }

  h2 {
    margin: 0 0 var(--space-4);
    font-size: var(--text-size-md);
    font-weight: var(--weight-semibold);
  }

  .name {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--space-5);
  }

  table {
    flex: 1;
    border-collapse: collapse;
    font-size: var(--text-size-sm);
  }

  th,
  td {
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--separator);
    font-weight: var(--weight-regular);
    text-align: left;
  }

  td {
    padding-left: var(--space-3);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .note {
    margin-top: var(--space-3);
  }
</style>
