<script lang="ts">
import type { ProviderErrorKind } from "../../ai/provider";
import type { Layout } from "../../core/layouts/layout";
import { LAYOUTS } from "../../core/layouts/registry";
import {
  ACCENT_VALUES,
  AI_MODES,
  CARET_VALUES,
  LANGUAGE_VALUES,
  REDUCE_MOTION_VALUES,
  SESSION_LENGTHS,
  TARGET_ACCURACIES,
  TARGET_WPMS,
  TEXT_SIZE_VALUES,
  THEME_VALUES,
} from "../../core/settings/settings";
import DangerZone from "../components/DangerZone.svelte";
import { saveSettings, ui } from "../state.svelte";
import { t } from "../strings";

const ERROR_MODES = ["stop", "continue"] as const;

// Switching layout loads its word list and progress, which App owns.
const { onlayout }: { onlayout: (id: Layout["id"]) => void } = $props();

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
  <h1>{t.settings.title}</h1>
  <section aria-labelledby="general">
    <h2 id="general">{t.settings.general}</h2>
    <label>
      {t.settings.languageLabel}
      <select
        value={ui.settings.language}
        onchange={(e) => {
          const next = LANGUAGE_VALUES[e.currentTarget.selectedIndex];
          if (next) {
            ui.settings.language = next;
            saveSettings();
          }
        }}
      >
        {#each LANGUAGE_VALUES as l}<option value={l}>{t.settings.languageNames[l]}</option>{/each}
      </select>
    </label>
    <label>
      {t.layoutLabel}
      <select value={ui.settings.layout} onchange={(e) => onlayout(LAYOUTS[e.currentTarget.selectedIndex]?.id ?? ui.settings.layout)}>
        {#each LAYOUTS as l}<option value={l.id}>{t.layoutNames[l.id]}</option>{/each}
      </select>
    </label>
  </section>
  <section aria-labelledby="appearance">
    <h2 id="appearance">{t.settings.appearance}</h2>
    <label>
      {t.settings.themeLabel}
      <select
        value={ui.settings.theme}
        onchange={(e) => {
          const next = THEME_VALUES[e.currentTarget.selectedIndex];
          if (next) {
            ui.settings.theme = next;
            saveSettings();
          }
        }}
      >
        {#each THEME_VALUES as v}<option value={v}>{t.settings.themeNames[v]}</option>{/each}
      </select>
    </label>
    <label>
      {t.settings.accentLabel}
      <select
        value={ui.settings.accent}
        onchange={(e) => {
          const next = ACCENT_VALUES[e.currentTarget.selectedIndex];
          if (next) {
            ui.settings.accent = next;
            saveSettings();
          }
        }}
      >
        {#each ACCENT_VALUES as v}<option value={v}>{t.settings.accentNames[v]}</option>{/each}
      </select>
    </label>
    <label>
      {t.settings.textSizeLabel}
      <select
        value={ui.settings.textSize}
        onchange={(e) => {
          const next = TEXT_SIZE_VALUES[e.currentTarget.selectedIndex];
          if (next) {
            ui.settings.textSize = next;
            saveSettings();
          }
        }}
      >
        {#each TEXT_SIZE_VALUES as v}<option value={v}>{t.settings.textSizeNames[v]}</option>{/each}
      </select>
    </label>
    <label>
      {t.settings.caretLabel}
      <select
        value={ui.settings.caret}
        onchange={(e) => {
          const next = CARET_VALUES[e.currentTarget.selectedIndex];
          if (next) {
            ui.settings.caret = next;
            saveSettings();
          }
        }}
      >
        {#each CARET_VALUES as v}<option value={v}>{t.settings.caretNames[v]}</option>{/each}
      </select>
    </label>
  </section>
  <section aria-labelledby="practice">
    <h2 id="practice">{t.settings.practice}</h2>
    <label>
      {t.lengthLabel}
      <select
        value={SESSION_LENGTHS.findIndex((l) => l.kind === ui.settings.length.kind && l.amount === ui.settings.length.amount)}
        onchange={(e) => {
          const next = SESSION_LENGTHS[e.currentTarget.selectedIndex];
          if (next) {
            ui.settings.length = next;
            saveSettings();
          }
        }}
      >
        {#each SESSION_LENGTHS as l, i}<option value={i}>{l.kind === "words" ? t.words(l.amount) : t.seconds(l.amount)}</option>{/each}
      </select>
    </label>
    <label>
      {t.lessons.accuracy}
      <select
        value={TARGET_ACCURACIES.findIndex((a) => a === ui.settings.targets.accuracy)}
        onchange={(e) => {
          const accuracy = TARGET_ACCURACIES[e.currentTarget.selectedIndex];
          if (accuracy !== undefined) {
            ui.settings.targets = { ...ui.settings.targets, accuracy };
            saveSettings();
          }
        }}
      >
        {#each TARGET_ACCURACIES as a, i}<option value={i}>{Math.round(a * 100)} %</option>{/each}
      </select>
    </label>
    <label>
      {t.lessons.speed}
      <select
        value={TARGET_WPMS.findIndex((w) => w === ui.settings.targets.wpm)}
        onchange={(e) => {
          const wpm = TARGET_WPMS[e.currentTarget.selectedIndex];
          if (wpm !== undefined) {
            ui.settings.targets = { ...ui.settings.targets, wpm };
            saveSettings();
          }
        }}
      >
        {#each TARGET_WPMS as w, i}<option value={i}>{t.lessons.wpm(w)}</option>{/each}
      </select>
    </label>
    <label>
      {t.settings.errorModeLabel}
      <select
        value={ui.settings.errorMode}
        onchange={(e) => {
          const next = ERROR_MODES[e.currentTarget.selectedIndex];
          if (next) {
            ui.settings.errorMode = next;
            saveSettings();
          }
        }}
      >
        {#each ERROR_MODES as m}<option value={m}>{t.settings.errorModeNames[m]}</option>{/each}
      </select>
    </label>
    <label class="check">
      <input type="checkbox" role="switch" bind:checked={ui.settings.liveStats} onchange={saveSettings} />
      {t.settings.liveStats}
    </label>
    <label class="check">
      <input type="checkbox" role="switch" bind:checked={ui.settings.developerMode} onchange={saveSettings} aria-describedby="developer-note" />
      {t.settings.developerMode}
    </label>
    <p class="note" id="developer-note">{t.settings.developerModeNote}</p>
  </section>
  <section aria-labelledby="accessibility">
    <h2 id="accessibility">{t.settings.accessibility}</h2>
    <label>
      {t.reduceMotionLabel}
      <select
        value={ui.settings.reduceMotion}
        onchange={(e) => {
          const next = REDUCE_MOTION_VALUES[e.currentTarget.selectedIndex];
          if (next) {
            ui.settings.reduceMotion = next;
            saveSettings();
          }
        }}
      >
        {#each REDUCE_MOTION_VALUES as m}<option value={m}>{t.reduceMotionModes[m]}</option>{/each}
      </select>
    </label>
  </section>
  <section aria-labelledby="model-server">
    <h2 id="model-server">{t.settings.modelServer}</h2>
    <p class="note">{t.settings.intro}</p>
    <label class="check">
      <input type="checkbox" role="switch" bind:checked={server.enabled} onchange={saveSettings} />
      {t.settings.enabled}
    </label>
    {#if server.enabled}
      <fieldset>
        <legend>{t.settings.modes}</legend>
        {#each AI_MODES as m}
          <label class="check">
            <input type="checkbox" bind:checked={server.modes[m]} onchange={saveSettings} />
            {t.settings.modeNames[m]}
          </label>
        {/each}
      </fieldset>
      <p class="note">{t.settings.topicNote}</p>
    {/if}
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
        <h3>{t.settings.corsTitle}</h3>
        <p>{t.settings.corsIntro}</p>
        <ul>
          <li>{t.settings.corsOllama(location.origin)}</li>
          <li>{t.settings.corsLmStudio}</li>
          <li>{t.settings.corsOther}</li>
        </ul>
      </div>
    {/if}
  </section>
  <DangerZone />
</main>

<style>
  main {
    max-width: 36rem;
    margin: 0 auto;
    padding: calc(var(--space-8) + var(--space-4)) var(--space-4) var(--space-6);
  }

  h1 {
    margin: 0 0 var(--space-5);
    font-size: var(--text-size-xl);
    font-weight: var(--weight-semibold);
  }

  section {
    display: grid;
    margin-bottom: var(--space-5);
    gap: var(--space-3);
    padding: var(--space-4);
    border-radius: var(--radius-group);
    background: var(--surface);
  }

  h2,
  h3 {
    margin: 0;
    font-size: var(--text-size-sm);
    font-weight: var(--weight-semibold);
  }

  h2 {
    color: var(--text-2);
  }

  p,
  ul {
    margin: 0;
  }

  .cors {
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  /* Label left, control right, as in system preferences. */
  label {
    display: grid;
    grid-template-columns: 1fr minmax(0, 16rem);
    align-items: center;
    gap: var(--space-3);
    color: var(--text);
    font-size: var(--text-size-sm);
  }

  label:not(.check) + label:not(.check) {
    padding-top: var(--space-3);
    border-top: 1px solid var(--separator);
  }

  @media (width < 480px) {
    label {
      grid-template-columns: 1fr;
      gap: var(--space-1);
    }
  }

  /* On a surface group the controls sit on the window colour, so they still read as raised. */
  input,
  select,
  button {
    background: var(--bg);
  }

  .check {
    display: flex;
    flex-direction: row-reverse;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
  }

  fieldset {
    display: grid;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    border: 0;
  }

  legend {
    padding: 0;
    margin-bottom: var(--space-2);
    color: var(--text-2);
    font-size: var(--text-size-sm);
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
