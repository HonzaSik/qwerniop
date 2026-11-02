<script lang="ts">
import type { Layout } from "../../core/layouts/layout";
import { stageCount } from "../../core/lessons/letters";
import { saveSettings, ui } from "../state.svelte";
import { t } from "../strings";

interface Props {
  layout: Layout["id"];
  letters: number;
  /** Resolves false when the model gave no passage; the signal cancels the wait. */
  onstart: (topic: string, signal: AbortSignal) => Promise<boolean>;
}

let { layout, letters, onstart }: Props = $props();

const server = $derived(ui.settings.modelServer);
const configured = $derived(server.enabled && server.model !== "");
const all = $derived(stageCount(layout));
const reached = $derived(letters >= all || ui.settings.developerMode);
const active = $derived(server.modes.topic && server.topic.trim() !== "");

let topic = $state("");
let waiting = $state(false);
let failed = $state(false);
let controller: AbortController | undefined;

// Leaving Lessons abandons the wait, so a late passage cannot pull the learner back to Practice.
$effect(() => () => controller?.abort());

async function begin(chosen: string): Promise<void> {
  controller = new AbortController();
  waiting = true;
  failed = false;
  const started = await onstart(chosen, controller.signal);
  waiting = false;
  failed = !started;
}

function stop(): void {
  failed = false;
  ui.settings.modelServer.modes.topic = false;
  saveSettings();
}
</script>

<section aria-labelledby="track-topic">
  <h2 id="track-topic">{t.topics.title}</h2>
  {#if !configured}
    <p class="note">{t.topics.intro}</p>
    <a href="#settings">{t.topics.setUp}</a>
  {:else if !reached}
    <p class="note">{t.topics.locked(letters, all)}</p>
  {:else if active}
    <p class="note">{t.topics.learning(server.topic.trim())}</p>
    <div class="row">
      <button type="button" class="primary" disabled={waiting} onclick={() => begin(server.topic.trim())}>{t.topics.next}</button>
      <button type="button" disabled={waiting} onclick={stop}>{t.topics.stop}</button>
    </div>
  {:else}
    <form
      class="row"
      onsubmit={(e) => {
        e.preventDefault();
        begin(topic.trim());
      }}
    >
      <input
        type="text"
        spellcheck="false"
        autocomplete="off"
        maxlength="80"
        aria-label={t.topics.field}
        placeholder={t.topics.placeholder}
        bind:value={topic}
      />
      <button type="submit" class="primary" disabled={waiting || topic.trim() === ""}>{t.topics.start}</button>
    </form>
  {/if}
  <p class="note" role="status">
    {#if waiting}{t.topics.writing}{:else if failed}{t.topics.failed}{/if}
  </p>
</section>

<style>
  section {
    margin-bottom: var(--space-6);
  }

  h2 {
    margin: 0 0 var(--space-3);
    font-size: var(--text-size-md);
    font-weight: var(--weight-semibold);
  }

  a {
    display: inline-block;
    margin-top: var(--space-2);
    color: var(--accent);
    font-size: var(--text-size-sm);
  }

  .row {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  input {
    flex: 1;
    min-width: 0;
  }

  [role="status"] {
    margin-top: var(--space-2);
  }

  [role="status"]:empty {
    margin: 0;
  }
</style>
