<script lang="ts">
import "./ui/styles/tokens.css";
import { unlockedLetters } from "./core/lessons/letters";
import { trackStages } from "./core/lessons/tracks";
import {
  type ContentType,
  generateContent,
  parseSnippets,
} from "./core/text/content";
import { seededRng } from "./core/text/rng";
import { loadSnippets, loadWords } from "./ui/content";
import { lengthLabel, SESSION_LENGTHS, ui } from "./ui/state.svelte";
import Practice from "./ui/views/Practice.svelte";

// Milestone 5's Lessons view replaces this picker; until then it shows every content type.
const TYPES: ContentType[] = ["words", "punctuation", "numbers", "code"];
// Words a timed session generates per second: 4 is 240 wpm, so nobody outruns the text.
const WORDS_PER_SECOND = 4;

let type: ContentType = $state("words");
const seed = Date.now();
const letters = unlockedLetters("en-us", 99) ?? "";

const data = Promise.all([loadWords(), loadSnippets()]);
const text = (words: string[], snippets: string) =>
  generateContent({
    type,
    words,
    snippets: parseSnippets(snippets),
    letters,
    stage: type === "words" ? 0 : trackStages(type),
    length:
      ui.length.kind === "words"
        ? ui.length.amount
        : ui.length.amount * WORDS_PER_SECOND,
    rng: seededRng(seed),
  });
</script>

{#await data then [words, snippets]}
  {#key `${type}${seed}${ui.length.kind}${ui.length.amount}`}
    <Practice
      text={text(words, snippets)}
      errorMode="stop"
      timeLimit={ui.length.kind === "seconds" ? ui.length.amount * 1000 : undefined}
    />
  {/key}
  <label class="type">
    Content
    <select bind:value={type}>
      {#each TYPES as t}<option value={t}>{t}</option>{/each}
    </select>
  </label>
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

  .type,
  .length {
    position: fixed;
    right: var(--space-4);
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  .type {
    top: var(--space-4);
  }

  .length {
    top: calc(var(--space-4) + var(--space-6));
  }
</style>
