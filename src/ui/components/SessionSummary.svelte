<script lang="ts">
import type { Session } from "../../core/engine/engine";
import { accuracy, duration, netWpm } from "../../core/engine/results";
import type { DailyResult } from "../../core/stats/daily";
import type { SummaryPet } from "../pet-summary";
import { savesSessions } from "../state.svelte";
import { t } from "../strings";
import {
  drillKeys,
  formatAccuracy,
  formatChange,
  formatDuration,
  isRestartKey,
} from "./session-summary";

interface Props {
  /** Finished, so its results no longer change. */
  session: Session;
  feedback?:
    | {
        weakest: string[];
        sentence: string;
        recap?: string | undefined;
        pet?: SummaryPet | undefined;
        daily?: DailyResult | undefined;
        change?: number | undefined;
      }
    | undefined;
  onrestart: () => void;
  onnext: () => void;
  ondrill: (labels: readonly string[]) => void;
}

let { session, feedback, onrestart, onnext, ondrill }: Props = $props();

let continueButton = $state<HTMLButtonElement>();

function onkeydown(event: KeyboardEvent): void {
  // Letters in the name box are the name, not shortcuts.
  if (event.target instanceof HTMLInputElement) return;
  if (isRestartKey(event, event.target instanceof HTMLButtonElement)) {
    event.preventDefault();
    if (event.key === "Enter") onnext();
    else onrestart();
  }
}

function focusOnShow(button: HTMLButtonElement): void {
  // The textarea that held focus is gone, and Enter should reach this button.
  button.focus({ preventScroll: true });
}
</script>

<svelte:window {onkeydown} />

<section aria-label={t.summary.label}>
  <dl>
    <div>
      <dt>{t.summary.wpm}</dt>
      <dd>{Math.round(netWpm(session))} <span class="unit">{t.stats.wpmUnit}</span></dd>
      {#if feedback?.change !== undefined}<dd class="change">{t.summary.change(formatChange(feedback.change))}</dd>{/if}
    </div>
    <div>
      <dt>{t.summary.accuracy}</dt>
      <dd>{formatAccuracy(accuracy(session))}</dd>
    </div>
    <div>
      <dt>{t.summary.time}</dt>
      <dd>{formatDuration(duration(session))}</dd>
    </div>
    {#if feedback && feedback.weakest.length > 0}
      <div>
        <dt>{t.summary.weakest}</dt>
        <dd class="keys">{#each feedback.weakest as key, i}{#if i > 0}{" "}{/if}<kbd>{key}</kbd>{/each}</dd>
        {#if drillKeys(feedback.weakest).length > 0}
          <dd><button type="button" class="drill" onclick={() => ondrill(feedback.weakest)}>{t.summary.drill}</button></dd>
        {/if}
      </div>
    {/if}
  </dl>
  <div class="result">
    {#if savesSessions()}
      <!-- Held open while the session saves, so nothing jumps when the pet arrives. -->
      <div class="slot">
        {#if feedback?.pet}
          {#await import("./Pet.svelte") then { default: Pet }}
            <Pet pet={feedback.pet.state} cheer={feedback.pet.cheer} />
          {/await}
        {/if}
      </div>
    {/if}
    <div class="words">
      {#if feedback}<p>{feedback.sentence}</p>{/if}
      {#if feedback?.pet}
        {#await import("./PetName.svelte") then { default: PetName }}
          <PetName pet={feedback.pet} onnamed={() => continueButton?.focus({ preventScroll: true })} onskip={onnext} />
        {/await}
      {/if}
    </div>
  </div>
  {#if feedback?.daily}
    {#await import("./DailyResultLine.svelte") then { default: DailyResultLine }}
      <DailyResultLine result={feedback.daily} />
    {/await}
  {/if}
  {#if feedback?.recap}<p><strong>{t.summary.recap}</strong> {feedback.recap}</p>{/if}
  <div class="actions">
    <button class="primary" aria-keyshortcuts="Enter" bind:this={continueButton} onclick={onnext} use:focusOnShow>
      {t.summary.next}
    </button>
    <button aria-keyshortcuts="R" onclick={onrestart}>{t.summary.repeat}</button>
  </div>
</section>

<style>
  section {
    display: grid;
    gap: var(--space-6);
    justify-items: center;
  }

  :global(:root:not([data-reduce-motion])) section {
    animation: appear var(--duration-view) var(--ease);
  }

  @keyframes appear {
    from {
      opacity: 0;
    }
  }

  .result {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .slot {
    flex: none;
    width: var(--pet-size);
    height: calc(var(--pet-size) + var(--pet-caption));
  }

  .words {
    display: grid;
    gap: var(--space-2);
  }

  dl {
    display: flex;
    margin: 0;
  }

  dl > div {
    padding: 0 var(--space-5);
  }

  dl > div + div {
    border-left: 1px solid var(--separator);
  }

  /* Four columns do not fit a phone; two rows of two read better than squeezed numbers. */
  @media (width < 480px) {
    dl {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4) 0;
    }

    dl > div:nth-child(odd) {
      border-left: 0;
    }
  }

  p {
    margin: 0;
    color: var(--text-2);
    font-size: var(--text-size-md);
  }

  dt {
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  dd {
    margin: 0;
    font-size: var(--text-size-xl);
    font-weight: var(--weight-semibold);
    font-variant-numeric: tabular-nums;
  }

  .unit {
    color: var(--text-2);
    font-size: var(--text-size-sm);
    font-weight: var(--weight-regular);
  }

  .change {
    color: var(--text-2);
    font-size: var(--text-size-sm);
    font-weight: var(--weight-regular);
  }

  .keys {
    display: flex;
    gap: var(--space-1);
  }

  .keys kbd {
    font-size: var(--text-size-md);
  }

  .actions {
    display: flex;
    gap: var(--space-3);
  }

  /* The one action of the screen, so a size up from other buttons. */
  button {
    min-height: calc(var(--control-height) + var(--space-2));
    padding: 0 var(--space-5);
    font-size: var(--text-size-md);
  }

  /* Not an action of the screen: Continue stays the one to press. */
  .drill {
    min-height: 0;
    margin-top: var(--space-2);
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-size-sm);
    font-weight: var(--weight-regular);
  }
</style>
