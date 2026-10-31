<script lang="ts">
import type { Session } from "../../core/engine/engine";
import { accuracy, duration, netWpm } from "../../core/engine/results";
import { t } from "../strings";
import {
  formatAccuracy,
  formatDuration,
  isRestartKey,
} from "./session-summary";

interface Props {
  /** Finished, so its results no longer change. */
  session: Session;
  feedback?:
    | { weakest: string[]; sentence: string; recap?: string | undefined }
    | undefined;
  onrestart: () => void;
  onnext: () => void;
}

let { session, feedback, onrestart, onnext }: Props = $props();

function onkeydown(event: KeyboardEvent): void {
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
      <dd>{Math.round(netWpm(session))}</dd>
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
        <dd>{feedback.weakest.join(" ")}</dd>
      </div>
    {/if}
  </dl>
  {#if feedback}<p>{feedback.sentence}</p>{/if}
  {#if feedback?.recap}<p><strong>{t.summary.recap}</strong> {feedback.recap}</p>{/if}
  <div class="actions">
    <button class="primary" aria-keyshortcuts="Enter" onclick={onnext} use:focusOnShow>
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

  dl {
    display: flex;
    gap: var(--space-6);
    margin: 0;
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

  .actions {
    display: flex;
    gap: var(--space-3);
  }

  button {
    padding: var(--space-2) var(--space-4);
    border: 0;
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: var(--text-size-md);
  }

  button.primary {
    background: var(--accent);
    /* Meets AA on the accent in both appearances: the ratios DESIGN.md gives against --bg. */
    color: var(--bg);
  }
</style>
