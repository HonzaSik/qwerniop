<script lang="ts">
import type { ProviderErrorKind } from "../../ai/provider";
import { saveSettings, ui } from "../state.svelte";
import { t } from "../strings";

type Result =
  | { state: "idle" }
  | { state: "testing" }
  | { state: "ok"; count: number }
  | { state: "failed"; kind: ProviderErrorKind };

let result: Result = $state({ state: "idle" });
// Only what the last test returned; the saved model is kept even if it is not listed.
let models: string[] = $state([]);
const server = $derived(ui.settings.modelServer);
const choices = $derived(
  server.model && !models.includes(server.model)
    ? [server.model, ...models]
    : models,
);

async function test(): Promise<void> {
  result = { state: "testing" };
  // The ai chunk loads here, the first time the user asks for it.
  const [{ createOpenAiProvider }, { ProviderError }] = await Promise.all([
    import("../../ai/openai-compatible"),
    import("../../ai/provider"),
  ]);
  try {
    const found = await createOpenAiProvider({
      baseUrl: server.baseUrl.trim(),
      model: server.model,
      apiKey: server.apiKey,
    }).listModels();
    models = found;
    result = { state: "ok", count: found.length };
    if (!found.includes(server.model) && found[0] !== undefined) {
      server.model = found[0];
      saveSettings();
    }
  } catch (error) {
    // Anything that is not a ProviderError (a malformed URL throws one) is treated as unreachable.
    result = {
      state: "failed",
      kind: error instanceof ProviderError ? error.kind : "network",
    };
  }
}
</script>

<main aria-label={t.nav.settings}>
  <h2>{t.settings.title}</h2>
  <section aria-labelledby="model-server">
    <h3 id="model-server">{t.settings.modelServer}</h3>
    <p class="note">{t.settings.intro}</p>
    <label>
      {t.settings.baseUrl}
      <input type="url" spellcheck="false" autocomplete="off" bind:value={server.baseUrl} onchange={saveSettings} />
    </label>
    <label>
      {t.settings.apiKey}
      <input type="password" autocomplete="off" bind:value={server.apiKey} onchange={saveSettings} />
    </label>
    <p class="note">{t.settings.apiKeyNote}</p>
    <label>
      {t.settings.model}
      <select value={server.model} disabled={choices.length === 0} onchange={(e) => { server.model = e.currentTarget.value; saveSettings(); }}>
        {#if choices.length === 0}<option value="">{t.settings.noModel}</option>{/if}
        {#each choices as m}<option value={m}>{m}</option>{/each}
      </select>
    </label>
    <div class="row">
      <button type="button" onclick={test} disabled={result.state === "testing"}>{t.settings.test}</button>
      <p class="status" class:failed={result.state === "failed"} role="status">
        {#if result.state === "testing"}
          {t.settings.testing}
        {:else if result.state === "ok"}
          <span class="dot ok" aria-hidden="true"></span>{t.settings.connected(result.count)}
        {:else if result.state === "failed"}
          <span class="dot bad" aria-hidden="true"></span>{t.settings.errors[result.kind]}
        {/if}
      </p>
    </div>
    {#if result.state === "failed" && result.kind === "network"}
      <div class="cors">
        <h4>{t.settings.corsTitle}</h4>
        <p>{t.settings.corsIntro}</p>
        <ul>
          <li>{t.settings.corsOllama(location.origin)}</li>
          <li>{t.settings.corsLmStudio}</li>
          <li>{t.settings.corsOther}</li>
        </ul>
      </div>
    {/if}
  </section>
</main>

<style>
  main {
    max-width: 36rem;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4) var(--space-6);
  }

  h2 {
    margin: 0 0 var(--space-5);
    font-size: var(--text-size-md);
    font-weight: var(--weight-semibold);
  }

  section {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-4);
    border-radius: var(--radius-group);
    background: var(--surface);
  }

  h3,
  h4 {
    margin: 0;
    font-size: var(--text-size-sm);
    font-weight: var(--weight-semibold);
  }

  p,
  ul {
    margin: 0;
  }

  .note,
  .cors {
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  label {
    display: grid;
    gap: var(--space-1);
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  input,
  select,
  button {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--separator);
    border-radius: var(--radius-control);
    background: var(--bg);
    color: var(--text);
    font: inherit;
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .status {
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  /* Error text is underlined as well as red, so colour is not the only signal. */
  .status.failed {
    color: var(--error);
    text-decoration: underline;
  }

  .dot {
    display: inline-block;
    width: var(--space-2);
    height: var(--space-2);
    margin-right: var(--space-2);
    border-radius: 50%;
  }

  .dot.ok {
    background: var(--accent);
  }

  .dot.bad {
    background: var(--error);
  }

  .cors {
    display: grid;
    gap: var(--space-2);
  }

  .cors ul {
    padding-left: var(--space-5);
  }
</style>
