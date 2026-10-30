<script lang="ts">
import "./ui/styles/tokens.css";
import type { Session } from "./core/engine/engine";
import { sessionRecord } from "./core/engine/record";
import { enUs } from "./core/layouts/en-us";
import {
  completeLesson,
  type Lesson,
  lessonTitle,
  nextLesson,
} from "./core/lessons/lessons";
import { unlockedLetters } from "./core/lessons/letters";
import { SESSION_LENGTHS } from "./core/settings/settings";
import { foldSession } from "./core/stats/chars";
import { generateContent, parseSnippets } from "./core/text/content";
import { seededRng } from "./core/text/rng";
import { loadStore } from "./storage/store";
import { loadSnippets, loadWords } from "./ui/content";
import {
  hydrate,
  lengthLabel,
  readSessions,
  saveProgress,
  saveSession,
  saveSettings,
  ui,
} from "./ui/state.svelte";
import Lessons from "./ui/views/Lessons.svelte";
import Practice from "./ui/views/Practice.svelte";
import Stats from "./ui/views/Stats.svelte";

// Words a timed session generates per second: 4 is 240 wpm, so nobody outruns the text.
const WORDS_PER_SECOND = 4;
const LAYOUT = enUs.id;

// The hash is the view, so Back works and the nav is plain links.
let hash = $state(location.hash);
const view = $derived(
  hash === "#lessons" ? "lessons" : hash === "#stats" ? "stats" : "practice",
);

// One practice run: the lesson, a seed so every run has new text, and the letters known when it began.
function begin(lesson: Lesson) {
  return { lesson, seed: Date.now(), letterStage: ui.progress.letters };
}
let run = $state(begin(ui.lesson));

function start(lesson: Lesson): void {
  ui.lesson = lesson;
  run = begin(lesson);
  location.hash = "#practice";
}

// Storage loads alongside the word list, so it adds no wait of its own; any failure leaves the defaults.
function finish(session: Session): void {
  const done = completeLesson(LAYOUT, ui.progress, run.lesson);
  ui.progress = { ...done, stats: foldSession(done.stats, session.log) };
  saveProgress();
  saveSession(sessionRecord(session, LAYOUT, run.lesson, Date.now()));
}

const data = Promise.all([
  loadWords(),
  loadSnippets(),
  loadStore(LAYOUT).then(hydrate),
]).then(([words, snippets]) => {
  run = begin(ui.lesson);
  return [words, snippets] as const;
});
const text = (words: string[], snippets: string) =>
  generateContent({
    type: run.lesson.track === "letters" ? "words" : run.lesson.track,
    words,
    snippets: parseSnippets(snippets),
    letters: unlockedLetters(LAYOUT, run.letterStage) ?? "",
    stage: run.lesson.track === "letters" ? 0 : run.lesson.stage,
    length:
      ui.settings.length.kind === "words"
        ? ui.settings.length.amount
        : ui.settings.length.amount * WORDS_PER_SECOND,
    rng: seededRng(run.seed),
  });
</script>

<svelte:window onhashchange={() => (hash = location.hash)} />

{#await data then [words, snippets]}
  <nav aria-label="Views">
    <a href="#practice" aria-current={view === "practice" ? "page" : undefined}>Practice</a>
    <a href="#lessons" aria-current={view === "lessons" ? "page" : undefined}>Lessons</a>
    <a href="#stats" aria-current={view === "stats" ? "page" : undefined}>Stats</a>
  </nav>
  {#if view === "lessons"}
    <Lessons layout={LAYOUT} progress={ui.progress} current={ui.lesson} onstart={start} />
  {:else if view === "stats"}
    {#key hash}<Stats sessions={readSessions()} onimported={() => (run = begin(ui.lesson))} />{/key}
  {:else}
    {#key `${run.seed}${run.lesson.track}${run.lesson.stage}${ui.settings.length.kind}${ui.settings.length.amount}`}
      <Practice
        text={text(words, snippets)}
        title={lessonTitle(LAYOUT, run.lesson)}
        errorMode={ui.settings.errorMode}
        timeLimit={ui.settings.length.kind === "seconds" ? ui.settings.length.amount * 1000 : undefined}
        onfinish={finish}
        onnext={() => start(nextLesson(LAYOUT, run.lesson))}
      />
    {/key}
    <label class="length">
      Length
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
        {#each SESSION_LENGTHS as l, i}<option value={i}>{lengthLabel(l)}</option>{/each}
      </select>
    </label>
  {/if}
{:catch}
  <main class="error">
    <p>The word list could not be loaded.</p>
    <button type="button" onclick={() => location.reload()}>Try again</button>
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

  .length {
    position: fixed;
    top: var(--space-4);
    right: var(--space-4);
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }
</style>
