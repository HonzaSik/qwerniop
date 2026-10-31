<script lang="ts">
import "./ui/styles/tokens.css";
import { feedbackRule, weakestKeys } from "./core/adaptive/feedback";
import type { Targets } from "./core/adaptive/weakness";
import type { Session } from "./core/engine/engine";
import { sessionRecord } from "./core/engine/record";
import { accuracy, netWpm } from "./core/engine/results";
import type { Layout } from "./core/layouts/layout";
import { layoutById } from "./core/layouts/registry";
import {
  completeLesson,
  type Lesson,
  nextLesson,
} from "./core/lessons/lessons";
import { unlockedLetters } from "./core/lessons/letters";
import { type CharStats, foldSession } from "./core/stats/chars";
import { generateContent, parseSnippets } from "./core/text/content";
import { seededRng } from "./core/text/rng";
import { loadStore } from "./storage/store";
import {
  type Generated,
  generatedFeedback,
  generatedRecap,
  generatedText,
  textKey,
} from "./ui/ai";
import { keyLabel } from "./ui/components/keyboard-labels";
import { loadSnippets, loadWords } from "./ui/content";
import { createPrefetch } from "./ui/prefetch";
import { isBackKey, isHelpKey, isSettingsKey } from "./ui/shortcuts";
import {
  hydrate,
  readSessions,
  saveProgress,
  saveSession,
  switchLayout,
  topicStore,
  ui,
} from "./ui/state.svelte";
import { feedbackText, lessonTitle, t } from "./ui/strings";
import Lessons from "./ui/views/Lessons.svelte";
import Practice from "./ui/views/Practice.svelte";
import Settings from "./ui/views/Settings.svelte";
import Stats from "./ui/views/Stats.svelte";
import { applyUpdate, worker } from "./ui/worker.svelte";

// Reads the system preference live so changing it needs no reload.
const systemReduce = matchMedia("(prefers-reduced-motion: reduce)");
let systemReduced = $state(systemReduce.matches);
systemReduce.addEventListener("change", () => {
  systemReduced = systemReduce.matches;
});
// index.html ships "en"; follow the UI language so a screen reader picks the right voice.
$effect(() => {
  document.documentElement.lang = t.language;
});
// One attribute on the root drives every motion rule in CSS.
$effect(() => {
  const m = ui.settings.reduceMotion;
  document.documentElement.toggleAttribute(
    "data-reduce-motion",
    m === "on" || (m === "system" && systemReduced),
  );
});

// Words a timed session generates per second: 4 is 240 wpm, so nobody outruns the text.
const WORDS_PER_SECOND = 4;

// The hash is the view, so Back works and the nav is plain links.
let hash = $state(location.hash);
const layout = $derived(layoutById(ui.settings.layout));
// Replaced when the layout changes; the list belongs to the layout in use.
let words = $state.raw<string[]>([]);
const view = $derived(
  hash === "#lessons"
    ? "lessons"
    : hash === "#stats"
      ? "stats"
      : hash === "#settings"
        ? "settings"
        : "practice",
);

interface Run {
  lesson: Lesson;
  seed: number;
  letterStage: number;
  stats: CharStats;
  targets: Targets;
  /** Set when the session ends; not part of what the text depends on. */
  feedback?: { weakest: string[]; sentence: string; recap?: string };
  /** Text from the model server, when one was asked for and passed validation. */
  generated?: Generated | undefined;
}

// One practice run: the lesson, a seed so every run has new text, and the letters and stats known when it began.
function begin(lesson: Lesson): Run {
  // Stats are copied: finish() replaces them, and the text under the summary must not change for Repeat.
  return {
    lesson,
    seed: Date.now(),
    letterStage: ui.progress.letters,
    stats: $state.snapshot(ui.progress.stats),
    // Copied for the same reason: changing a target must not rewrite the text on screen.
    targets: $state.snapshot(ui.settings.targets),
  };
}
let run = $state(begin(ui.lesson));

// An import can bring another layout, whose words are not loaded yet.
async function afterImport(): Promise<void> {
  try {
    words = await loadWords(ui.settings.layout);
  } catch (error) {
    console.error("Word list failed to load", error);
  }
  run = begin(ui.lesson);
}

async function chooseLayout(id: Layout["id"]): Promise<void> {
  try {
    const loaded = await loadWords(id);
    await switchLayout(id);
    words = loaded;
    run = begin(ui.lesson);
  } catch (error) {
    console.error("Layout switch failed", error);
  }
}

let starting = 0;

const prefetch = createPrefetch<Generated>();

// What the next session will ask for: the lesson after the current one, under the progress known now.
function nextRequest() {
  const lesson = nextLesson(layout.id, run.lesson);
  return {
    server: $state.snapshot(ui.settings.modelServer),
    request: {
      layout: layout.id,
      lesson,
      letterStage: ui.progress.letters,
      stats: $state.snapshot(ui.progress.stats),
      targets: $state.snapshot(ui.settings.targets),
      words: targetWords(),
    },
  };
}

// Keeps the next passage generating in the background; a changed key (lesson, layout, unlock, settings) aborts the stale one.
$effect(() => {
  const { server, request } = nextRequest();
  const key = textKey(server, request);
  if (key === undefined) prefetch.cancel();
  else
    prefetch.request(key, (signal) =>
      generatedText(server, request, signal, topicStore),
    );
});

// Zero wait: the model text is used only if it is already there.
function start(lesson: Lesson): void {
  ui.lesson = lesson;
  const next = begin(lesson);
  const server = $state.snapshot(ui.settings.modelServer);
  const key = textKey(server, {
    layout: layout.id,
    lesson,
    letterStage: next.letterStage,
    stats: next.stats,
    targets: next.targets,
    words: targetWords(),
  });
  next.generated = key === undefined ? undefined : prefetch.take(key);
  run = next;
  location.hash = "#practice";
}

// Storage loads alongside the word list, so it adds no wait of its own; any failure leaves the defaults.
function finish(session: Session): void {
  // Fold first: the rule judges the stats including this session.
  const progress = {
    ...ui.progress,
    stats: foldSession(ui.progress.stats, session.log),
  };
  const track = run.lesson.track;
  const before = ui.progress[track];
  ui.progress = completeLesson(
    layout.id,
    progress,
    run.lesson,
    ui.settings.targets,
  );
  const after = ui.progress[track];
  const labels = weakestKeys(
    layout,
    ui.progress.stats,
    session.log.map((s) => s.expected),
    ui.settings.targets,
    3,
  ).map((code) => {
    const key = layout.keys.find((k) => k.code === code);
    return key ? keyLabel(key).main : code;
  });
  run.feedback = {
    weakest: labels,
    sentence: feedbackText(
      feedbackRule({
        wpm: netWpm(session),
        accuracy: accuracy(session),
        targets: ui.settings.targets,
        weakest: labels,
        unlocked:
          after > before
            ? lessonTitle(layout.id, { track, stage: after })
            : undefined,
      }),
    ),
  };
  const done = run;
  generatedFeedback($state.snapshot(ui.settings.modelServer), {
    layout: layout.id,
    wpm: netWpm(session),
    accuracy: accuracy(session),
    weakest: labels,
  }).then((sentence) => {
    if (sentence !== undefined && run === done && done.feedback) {
      done.feedback = { ...done.feedback, sentence };
    }
  });
  generatedRecap(
    $state.snapshot(ui.settings.modelServer),
    layout.id,
    done.generated?.recap,
  ).then((recap) => {
    if (recap !== undefined && run === done && done.feedback) {
      done.feedback = { ...done.feedback, recap };
    }
  });
  saveProgress();
  saveSession(sessionRecord(session, layout.id, run.lesson, Date.now()));
}

// The word list depends on the saved layout, so it loads once storage has answered.
const data = Promise.all([
  loadSnippets(),
  loadStore()
    .then(hydrate)
    .then(() => loadWords(ui.settings.layout)),
]).then(([snippets, loaded]) => {
  words = loaded;
  run = begin(ui.lesson);
  return snippets;
});
const targetWords = (): number =>
  ui.settings.length.kind === "words"
    ? ui.settings.length.amount
    : ui.settings.length.amount * WORDS_PER_SECOND;
const text = (snippets: string) =>
  generateContent({
    type: run.lesson.track === "letters" ? "words" : run.lesson.track,
    words,
    snippets: parseSnippets(snippets),
    letters: unlockedLetters(layout.id, run.letterStage) ?? "",
    stats: run.stats,
    targets: run.targets,
    stage: run.lesson.track === "letters" ? 0 : run.lesson.stage,
    length: targetWords(),
    rng: seededRng(run.seed),
  });

// Window, not document: input's document listener runs first, so a key it used (resume, typed text) arrives prevented.
function onkeydown(event: KeyboardEvent): void {
  if (help?.open) return;
  const target = event.target instanceof Element ? event.target : null;
  if (isHelpKey(event, target)) {
    event.preventDefault();
    help?.showModal();
  } else if (isSettingsKey(event, target)) {
    event.preventDefault();
    location.hash = "#settings";
  } else if (isBackKey(event, target) && view !== "practice") {
    event.preventDefault();
    location.hash = "#practice";
  }
}

let help: HTMLDialogElement | undefined = $state();
</script>

<svelte:window onhashchange={() => (hash = location.hash)} {onkeydown} />

<dialog bind:this={help} aria-labelledby="help-title">
  <h2 id="help-title">{t.help.title}</h2>
  <dl>
    {#each t.help.items as [key, what]}<dt>{key}</dt><dd>{what}</dd>{/each}
  </dl>
  <form method="dialog"><button type="submit">{t.help.close}</button></form>
</dialog>

{#if worker.waiting}
  <p class="update" role="status">
    {t.updateAvailable}
    <button type="button" onclick={applyUpdate}>{t.updateReload}</button>
  </p>
{/if}

{#await data then snippets}
  <nav aria-label={t.nav.label}>
    <a href="#practice" aria-current={view === "practice" ? "page" : undefined}>{t.nav.practice}</a>
    <a href="#lessons" aria-current={view === "lessons" ? "page" : undefined}>{t.nav.lessons}</a>
    <a href="#stats" aria-current={view === "stats" ? "page" : undefined}>{t.nav.stats}</a>
    <a href="#settings" aria-current={view === "settings" ? "page" : undefined}>{t.nav.settings}</a>
  </nav>
  {#if view === "lessons"}
    <Lessons layout={layout.id} progress={ui.progress} current={ui.lesson} onstart={start} />
  {:else if view === "settings"}
    <Settings onlayout={chooseLayout} />
  {:else if view === "stats"}
    {#key hash}<Stats sessions={readSessions()} onimported={afterImport} />{/key}
  {:else}
    {#key `${run.seed}${layout.id}${run.lesson.track}${run.lesson.stage}${ui.settings.length.kind}${ui.settings.length.amount}`}
      <Practice
        text={run.generated?.text ?? text(snippets)}
        title={lessonTitle(layout.id, run.lesson)}
        errorMode={ui.settings.errorMode}
        timeLimit={ui.settings.length.kind === "seconds" ? ui.settings.length.amount * 1000 : undefined}
        feedback={run.feedback}
        onfinish={finish}
        onnext={() => start(nextLesson(layout.id, run.lesson))}
      />
    {/key}
  {/if}
{:catch}
  <main class="error">
    <p>{t.wordListError}</p>
    <button type="button" onclick={() => location.reload()}>{t.tryAgain}</button>
  </main>
{/await}

<style>
  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-ui);
  }

  .error {
    display: grid;
    min-height: 100vh;
    place-content: center;
    justify-items: center;
    gap: var(--space-4);
    color: var(--text-2);
    font-size: var(--text-size-md);
  }

  .update {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-4);
    margin: 0;
    padding: var(--space-2);
    background: var(--surface);
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  .error p {
    margin: 0;
  }

  button {
    padding: var(--space-1) var(--space-4);
    border: 1px solid var(--separator);
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--text);
    font: inherit;
  }

  nav {
    position: fixed;
    top: var(--space-4);
    left: var(--space-4);
    display: flex;
    gap: var(--space-4);
    font-size: var(--text-size-sm);
  }

  nav a {
    color: var(--text-2);
    text-decoration: none;
  }

  nav a[aria-current="page"] {
    color: var(--text);
  }

  :global(:focus-visible) {
    outline: var(--focus-ring-width) solid var(--accent);
    outline-offset: var(--focus-ring-width);
  }

  dialog {
    max-width: 24rem;
    padding: var(--space-5);
    border: 1px solid var(--separator);
    border-radius: var(--radius-group);
    background: var(--bg);
    color: var(--text);
  }

  dialog h2 {
    margin: 0 0 var(--space-4);
    font-size: var(--text-size-md);
    font-weight: var(--weight-semibold);
  }

  dialog dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-2) var(--space-4);
    margin: 0 0 var(--space-4);
    font-size: var(--text-size-sm);
  }

  dialog dt {
    font-family: var(--font-practice);
  }

  dialog dd {
    margin: 0;
    color: var(--text-2);
  }
</style>
