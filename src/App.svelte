<script lang="ts">
import "./ui/styles/tokens.css";
import { enUs } from "./core/layouts/en-us";
import {
  completeLesson,
  type Lesson,
  lessonTitle,
  nextLesson,
} from "./core/lessons/lessons";
import { unlockedLetters } from "./core/lessons/letters";
import { generateContent, parseSnippets } from "./core/text/content";
import { seededRng } from "./core/text/rng";
import { loadSnippets, loadWords } from "./ui/content";
import { lengthLabel, SESSION_LENGTHS, ui } from "./ui/state.svelte";
import Lessons from "./ui/views/Lessons.svelte";
import Practice from "./ui/views/Practice.svelte";

// Words a timed session generates per second: 4 is 240 wpm, so nobody outruns the text.
const WORDS_PER_SECOND = 4;
const LAYOUT = enUs.id;

// The hash is the view, so Back works and the nav is plain links.
let hash = $state(location.hash);
const view = $derived(hash === "#lessons" ? "lessons" : "practice");

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

const data = Promise.all([loadWords(), loadSnippets()]);
const text = (words: string[], snippets: string) =>
  generateContent({
    type: run.lesson.track === "letters" ? "words" : run.lesson.track,
    words,
    snippets: parseSnippets(snippets),
    letters: unlockedLetters(LAYOUT, run.letterStage) ?? "",
    stage: run.lesson.track === "letters" ? 0 : run.lesson.stage,
    length:
      ui.length.kind === "words"
        ? ui.length.amount
        : ui.length.amount * WORDS_PER_SECOND,
    rng: seededRng(run.seed),
  });
</script>

<svelte:window onhashchange={() => (hash = location.hash)} />

{#await data then [words, snippets]}
  <nav aria-label="Views">
    <a href="#practice" aria-current={view === "practice" ? "page" : undefined}>Practice</a>
    <a href="#lessons" aria-current={view === "lessons" ? "page" : undefined}>Lessons</a>
  </nav>
  {#if view === "lessons"}
    <Lessons layout={LAYOUT} progress={ui.progress} current={ui.lesson} onstart={start} />
  {:else}
    {#key `${run.seed}${run.lesson.track}${run.lesson.stage}${ui.length.kind}${ui.length.amount}`}
      <Practice
        text={text(words, snippets)}
        title={lessonTitle(LAYOUT, run.lesson)}
        errorMode="stop"
        timeLimit={ui.length.kind === "seconds" ? ui.length.amount * 1000 : undefined}
        onfinish={() => (ui.progress = completeLesson(LAYOUT, ui.progress, run.lesson))}
        onnext={() => start(nextLesson(LAYOUT, run.lesson))}
      />
    {/key}
    <label class="length">
      Length
      <select
        value={SESSION_LENGTHS.findIndex((l) => l.kind === ui.length.kind && l.amount === ui.length.amount)}
        onchange={(e) => {
          const next = SESSION_LENGTHS[e.currentTarget.selectedIndex];
          if (next) ui.length = next;
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
