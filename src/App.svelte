<script lang="ts">
import "./ui/styles/tokens.css";
import { feedbackRule, weakestKeys } from "./core/adaptive/feedback";
import type { Targets } from "./core/adaptive/weakness";
import type { Session } from "./core/engine/engine";
import { sessionRecord } from "./core/engine/record";
import { accuracy, netWpm } from "./core/engine/results";
import type { Layout } from "./core/layouts/layout";
import { LAYOUTS, layoutById } from "./core/layouts/registry";
import {
  completeLesson,
  type Lesson,
  nextLesson,
} from "./core/lessons/lessons";
import { unlockedLetters } from "./core/lessons/letters";
import { SESSION_LENGTHS } from "./core/settings/settings";
import { type CharStats, foldSession } from "./core/stats/chars";
import { generateContent, parseSnippets } from "./core/text/content";
import { seededRng } from "./core/text/rng";
import { loadStore } from "./storage/store";
import { keyLabel } from "./ui/components/keyboard-labels";
import { loadSnippets, loadWords } from "./ui/content";
import {
  hydrate,
  readSessions,
  saveProgress,
  saveSession,
  saveSettings,
  switchLayout,
  ui,
} from "./ui/state.svelte";
import { feedbackText, lessonTitle, t } from "./ui/strings";
import Lessons from "./ui/views/Lessons.svelte";
import Practice from "./ui/views/Practice.svelte";
import Stats from "./ui/views/Stats.svelte";

// Words a timed session generates per second: 4 is 240 wpm, so nobody outruns the text.
const WORDS_PER_SECOND = 4;

// The hash is the view, so Back works and the nav is plain links.
let hash = $state(location.hash);
const layout = $derived(layoutById(ui.settings.layout));
// Replaced when the layout changes; the list belongs to the layout in use.
let words = $state.raw<string[]>([]);
const view = $derived(
  hash === "#lessons" ? "lessons" : hash === "#stats" ? "stats" : "practice",
);

interface Run {
  lesson: Lesson;
  seed: number;
  letterStage: number;
  stats: CharStats;
  targets: Targets;
  /** Set when the session ends; not part of what the text depends on. */
  feedback?: { weakest: string[]; sentence: string };
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

function start(lesson: Lesson): void {
  ui.lesson = lesson;
  run = begin(lesson);
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
const text = (snippets: string) =>
  generateContent({
    type: run.lesson.track === "letters" ? "words" : run.lesson.track,
    words,
    snippets: parseSnippets(snippets),
    letters: unlockedLetters(layout.id, run.letterStage) ?? "",
    stats: run.stats,
    targets: run.targets,
    stage: run.lesson.track === "letters" ? 0 : run.lesson.stage,
    length:
      ui.settings.length.kind === "words"
        ? ui.settings.length.amount
        : ui.settings.length.amount * WORDS_PER_SECOND,
    rng: seededRng(run.seed),
  });
</script>

<svelte:window onhashchange={() => (hash = location.hash)} />

{#await data then snippets}
  <nav aria-label={t.nav.label}>
    <a href="#practice" aria-current={view === "practice" ? "page" : undefined}>{t.nav.practice}</a>
    <a href="#lessons" aria-current={view === "lessons" ? "page" : undefined}>{t.nav.lessons}</a>
    <a href="#stats" aria-current={view === "stats" ? "page" : undefined}>{t.nav.stats}</a>
  </nav>
  {#if view === "lessons"}
    <Lessons layout={layout.id} progress={ui.progress} current={ui.lesson} onstart={start} />
  {:else if view === "stats"}
    {#key hash}<Stats sessions={readSessions()} onimported={afterImport} />{/key}
  {:else}
    {#key `${run.seed}${layout.id}${run.lesson.track}${run.lesson.stage}${ui.settings.length.kind}${ui.settings.length.amount}`}
      <Practice
        text={text(snippets)}
        title={lessonTitle(layout.id, run.lesson)}
        errorMode={ui.settings.errorMode}
        timeLimit={ui.settings.length.kind === "seconds" ? ui.settings.length.amount * 1000 : undefined}
        feedback={run.feedback}
        onfinish={finish}
        onnext={() => start(nextLesson(layout.id, run.lesson))}
      />
    {/key}
    <div class="controls">
    <label>
      {t.layoutLabel}
      <select value={layout.id} onchange={(e) => chooseLayout(LAYOUTS[e.currentTarget.selectedIndex]?.id ?? layout.id)}>
        {#each LAYOUTS as l}<option value={l.id}>{t.layoutNames[l.id]}</option>{/each}
      </select>
    </label>
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
    </div>
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

  nav a:focus-visible {
    outline: var(--focus-ring-width) solid var(--accent);
    outline-offset: var(--focus-ring-width);
  }

  .controls {
    position: fixed;
    top: var(--space-4);
    right: var(--space-4);
    display: flex;
    gap: var(--space-4);
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }
</style>
