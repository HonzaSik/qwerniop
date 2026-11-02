<script lang="ts">
import { deleteAllData, readSessions } from "../state.svelte";
import { t } from "../strings";

let dialog: HTMLDialogElement | undefined = $state();
let current = $state(0);
let failed = $state(false);

async function ask(): Promise<void> {
  failed = false;
  current = (await readSessions()).length;
  dialog?.showModal();
}

async function confirm(): Promise<void> {
  dialog?.close();
  try {
    await deleteAllData();
    location.hash = "#practice";
    // Nothing in memory survives to be saved back, and the app opens as for a new learner.
    location.reload();
  } catch (error) {
    console.error("Delete failed", error);
    failed = true;
  }
}
</script>

<section aria-labelledby="danger">
  <h2 id="danger">{t.danger.title}</h2>
  <p class="note">{t.danger.intro}</p>
  <div><button type="button" class="danger" onclick={ask}>{t.danger.delete}</button></div>
  {#if failed}<p class="note failed" role="alert">{t.danger.failed}</p>{/if}
</section>

<dialog bind:this={dialog} aria-labelledby="delete-title">
  <h2 id="delete-title">{t.danger.confirmTitle}</h2>
  <p>{t.danger.confirmBody(current)}</p>
  <p>{t.danger.warning}</p>
  <!-- Cancel comes first, so it takes the focus when the dialog opens and Enter cannot delete. -->
  <div class="row">
    <button type="button" onclick={() => dialog?.close()}>{t.data.cancel}</button>
    <button type="button" class="confirm" onclick={confirm}>{t.danger.confirm}</button>
  </div>
</dialog>

<style>
  section {
    display: grid;
    gap: var(--space-3);
    margin-bottom: var(--space-5);
    padding: var(--space-4);
    border-radius: var(--radius-group);
    background: var(--surface);
  }

  h2 {
    margin: 0;
    font-size: var(--text-size-sm);
    font-weight: var(--weight-semibold);
  }

  section h2 {
    color: var(--error);
  }

  .note {
    margin: 0;
  }

  .note.failed {
    color: var(--error);
    text-decoration: underline;
  }

  .danger {
    border-color: var(--error);
    background: var(--bg);
    color: var(--error);
  }

  .confirm {
    border-color: var(--error);
    background: var(--error);
    color: var(--bg);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  dialog {
    max-width: 24rem;
    padding: var(--space-4);
    border: 1px solid var(--separator);
    border-radius: var(--radius-group);
    background: var(--bg);
    color: var(--text);
  }

  dialog h2 {
    font-size: var(--text-size-md);
  }

  dialog p {
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }
</style>
