<script lang="ts">
import type { PetState } from "../../core/stats/pet";
import { t } from "../strings";
import Pet from "./Pet.svelte";

interface Props {
  pet: PetState;
}

let { pet }: Props = $props();

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
  [t.pet.age, t.pet.days(pet.ageDays)],
  [t.pet.counted, `${pet.minutes} min`],
  ...(pet.toNext === undefined ? [] : [[t.pet.toNext, `${pet.toNext} min`]]),
  [t.pet.last, lastPractised],
  [t.pet.lost, String(pet.lost)],
]);
</script>

<section aria-labelledby="pet">
  <h2 id="pet">{t.pet.title}</h2>
  <div class="row">
    <Pet stage={pet.stage} mood={pet.mood} />
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
  <p class="note">{t.pet.status(pet)}</p>
  <p class="note">{t.pet.note}</p>
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
