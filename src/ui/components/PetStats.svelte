<script lang="ts">
import type { PetState } from "../../core/stats/pet";
import type { PetMemory } from "../../core/stats/pet-memories";
import { ui } from "../state.svelte";
import { t } from "../strings";
import { tp } from "../strings/pet";
import Pet from "./Pet.svelte";

interface Props {
  pet: PetState;
  memories: readonly PetMemory[];
}

let { pet, memories }: Props = $props();

const name = $derived(ui.settings.petName || tp.unnamed);

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
  [tp.stageLabel, tp.stages[pet.stage]],
  [tp.level, String(pet.level)],
  [tp.together, tp.days(pet.togetherDays)],
  [tp.age, tp.days(pet.ageDays)],
  [tp.counted, `${pet.minutes} min`],
  ...(pet.toNext === undefined ? [] : [[tp.toNext, `${pet.toNext} min`]]),
  [tp.last, lastPractised],
  [tp.lost, String(pet.lost)],
]);
</script>

<section aria-labelledby="pet">
  <div>
    <h2 id="pet">{name}</h2>
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
    <p class="note">{tp.status(pet, name)}</p>
    <p class="note">{tp.note(name)}</p>
  </div>
  <div>
    <h3>{tp.memories}</h3>
    <ol>
      {#each [...memories].reverse() as memory}
        <li><span class="day">{tp.day(memory.day)}</span> {tp.memory(memory, name)}</li>
      {/each}
    </ol>
  </div>
</section>

<style>
  section {
    display: grid;
    gap: 0 var(--space-7);
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

  h3 {
    margin: var(--space-5) 0 var(--space-2);
    font-size: var(--text-size-sm);
    font-weight: var(--weight-semibold);
  }

  ol {
    margin: 0;
    padding: 0;
    font-size: var(--text-size-sm);
    list-style: none;
  }

  li {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-1) 0;
  }

  .day {
    flex: none;
    width: var(--pet-day-width);
    color: var(--text-2);
    font-variant-numeric: tabular-nums;
  }

  @media (min-width: 900px) {
    section {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
    }

    h3 {
      margin-top: 0;
    }
  }
</style>
