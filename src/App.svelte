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
import Practice from "./ui/views/Practice.svelte";

// Milestone 5's Lessons view replaces this picker; until then it shows every content type.
const TYPES: ContentType[] = ["words", "punctuation", "numbers", "code"];
const LENGTH = 30;

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
    length: LENGTH,
    rng: seededRng(seed),
  });
</script>

{#await data then [words, snippets]}
  {#key `${type}${seed}`}
    <Practice text={text(words, snippets)} errorMode="stop" />
  {/key}
  <label class="type">
    Content
    <select bind:value={type}>
      {#each TYPES as t}<option value={t}>{t}</option>{/each}
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

  .type {
    position: fixed;
    top: var(--space-4);
    right: var(--space-4);
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }
</style>
