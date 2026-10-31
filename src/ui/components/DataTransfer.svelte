<script lang="ts">
import type { AppData } from "../../core/export/export";
import { exportText, readSessions, replaceAll } from "../state.svelte";
import { t } from "../strings";

interface Props {
  onimported: () => void;
}

let { onimported }: Props = $props();

// Import files are untrusted; nothing legitimate comes near this.
const MAX_BYTES = 5 * 1024 * 1024;

let dialog: HTMLDialogElement | undefined = $state();
// Raw: IndexedDB cannot clone a reactive proxy.
let pending: { data: AppData; dropped: number; current: number } | null =
  $state.raw(null);
let message = $state("");
let failed = $state(false);

function say(text: string, isError = false): void {
  message = text;
  failed = isError;
}

async function download(): Promise<void> {
  try {
    const url = URL.createObjectURL(
      new Blob([await exportText()], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `tenfold-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    say(t.data.exported);
  } catch (error) {
    console.error("Export failed", error);
    say(t.data.exportFailed, true);
  }
}

async function pick(
  event: Event & { currentTarget: HTMLInputElement },
): Promise<void> {
  const input = event.currentTarget;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (file.size > MAX_BYTES) return say(t.data.tooLarge, true);
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    return say(t.data.notJson, true);
  }
  const { parseExport } = await import("../../core/export/export");
  const parsed = parseExport(raw);
  if (!parsed.ok) return say(t.data.errors[parsed.reason], true);
  pending = {
    data: parsed.value,
    dropped: parsed.droppedSessions,
    current: (await readSessions()).length,
  };
  say("");
  dialog?.showModal();
}

async function confirm(): Promise<void> {
  const next = pending;
  dialog?.close();
  pending = null;
  if (!next) return;
  try {
    const saved = await replaceAll(next.data);
    onimported();
    say(saved ? t.data.imported : t.data.importedMemory);
  } catch (error) {
    console.error("Import failed", error);
    say(t.data.importFailed, true);
  }
}
</script>

<section aria-labelledby="data">
  <h2 id="data">{t.data.title}</h2>
  <div class="row">
    <button type="button" onclick={download}>{t.data.export}</button>
    <label class="file">
      {t.data.import}
      <input type="file" accept="application/json,.json" onchange={pick} />
    </label>
  </div>
  <p class="note" role={failed ? "alert" : "status"} class:failed>{message}</p>
</section>

<dialog bind:this={dialog} aria-labelledby="replace-title" onclose={() => (pending = null)}>
  {#if pending}
    <h2 id="replace-title">{t.data.replaceTitle}</h2>
    <p>{t.data.replaceBody(pending.current, pending.data.sessions.length)}</p>
    {#if pending.dropped > 0}
      <p>{t.data.skipped(pending.dropped)}</p>
    {/if}
    <div class="row">
      <button type="button" onclick={() => dialog?.close()}>{t.data.cancel}</button>
      <button type="button" class="primary" onclick={confirm}>{t.data.replace}</button>
    </div>
  {/if}
</dialog>

<style>
  section {
    margin-bottom: var(--space-6);
  }

  h2 {
    margin: 0 0 var(--space-3);
    font-size: var(--text-size-md);
    font-weight: var(--weight-semibold);
  }

  .row {
    display: flex;
    gap: var(--space-3);
  }

  button,
  .file {
    padding: var(--space-1) var(--space-4);
    border: 1px solid var(--separator);
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: var(--text-size-sm);
    cursor: pointer;
  }

  .primary {
    border-color: var(--accent);
  }

  /* The input stays focusable inside its label; the label draws the button. */
  .file input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }

  .file:focus-within {
    outline: var(--focus-ring-width) solid var(--accent);
    outline-offset: var(--focus-ring-width);
  }

  .note {
    margin: var(--space-3) 0 0;
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  .note.failed {
    color: var(--error);
  }

  dialog {
    max-width: 24rem;
    padding: var(--space-4);
    border: 1px solid var(--separator);
    border-radius: var(--radius-group);
    background: var(--bg);
    color: var(--text);
  }

  dialog p {
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }
</style>
