<script lang="ts">
import type { Layout } from "../../core/layouts/layout";
import {
  isUnlocked,
  type Lesson,
  type LessonTrack,
  lessonCount,
  type Progress,
  TRACKS,
} from "../../core/lessons/lessons";
import { tracksOpen, tracksStart } from "../../core/lessons/tracks";
import TopicSection from "../components/TopicSection.svelte";
import { ui } from "../state.svelte";
import { lessonTitle, t } from "../strings";

interface Props {
  layout: Layout["id"];
  progress: Progress;
  current: Lesson;
  onstart: (lesson: Lesson) => void;
  onstarttopic: (topic: string, signal: AbortSignal) => Promise<boolean>;
}

let { layout, progress, current, onstart, onstarttopic }: Props = $props();

const stages = (track: LessonTrack) =>
  Array.from({ length: lessonCount(layout, track) }, (_, i) => i + 1);

const tracksReached = (track: LessonTrack) =>
  track === "letters" || tracksOpen(layout, progress.letters);

// A closed track keeps a stored count of 1, but nothing in it is unlocked yet.
const unlockedCount = (track: LessonTrack) =>
  tracksReached(track) ? progress[track] : 0;

const isOpen = (track: LessonTrack) =>
  ui.settings.developerMode || tracksReached(track);
</script>

<main aria-label={t.nav.lessons}>
  <h1>{t.nav.lessons}</h1>
  {#if ui.settings.developerMode}<p class="note developer">{t.lessons.developerMode}</p>{/if}
  {#each TRACKS as track}
    {@const all = lessonCount(layout, track)}
    <section aria-labelledby="track-{track}">
      <div class="heading">
        <h2 id="track-{track}">{t.trackNames[track]}</h2>
        {#if isOpen(track)}<span class="note">{t.lessons.count(unlockedCount(track), all)}</span>{/if}
      </div>
      {#if isOpen(track)}
        <div
          class="bar"
          role="progressbar"
          aria-labelledby="track-{track}"
          aria-valuemin={0}
          aria-valuemax={all}
          aria-valuenow={unlockedCount(track)}
          aria-valuetext={t.lessons.unlocked(unlockedCount(track), all)}
        >
          <div style:width="{(unlockedCount(track) / all) * 100}%"></div>
        </div>
        <ul>
          {#each stages(track) as stage}
            {@const lesson = { track, stage }}
            {@const unlocked = isUnlocked(layout, progress, lesson)}
            {@const open = unlocked || ui.settings.developerMode}
            {@const isCurrent = current.track === track && current.stage === stage}
            <li>
              <button
                type="button"
                disabled={!open}
                class:locked={!unlocked}
                aria-current={isCurrent}
                onclick={() => onstart(lesson)}
              >
                {lessonTitle(layout, lesson)}
                {#if isCurrent}<span class="state current">{t.lessons.current}</span>
                {:else if unlocked && stage < progress[track]}<span class="state">{t.lessons.done}</span>{/if}
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="note">{t.lessons.opensAt(tracksStart(layout) ?? 1)}</p>
      {/if}
    </section>
  {/each}
  <TopicSection {layout} letters={progress.letters} onstart={onstarttopic} />
</main>

<style>
  main {
    box-sizing: border-box;
    width: min(100%, var(--practice-column));
    min-height: 100vh;
    margin: 0 auto;
    padding: calc(var(--space-8) + var(--space-4)) var(--space-4) var(--space-6);
  }

  h1 {
    margin: 0 0 var(--space-6);
    font-size: var(--text-size-xl);
    font-weight: var(--weight-semibold);
  }

  section {
    margin-bottom: var(--space-6);
  }

  .heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .heading .note {
    font-variant-numeric: tabular-nums;
  }

  .bar {
    height: var(--space-1);
    margin: var(--space-2) 0 var(--space-3);
    overflow: hidden;
    border-radius: var(--radius-key);
    background: var(--surface);
  }

  .bar > div {
    height: 100%;
    background: var(--accent);
  }

  h2 {
    margin: 0;
    font-size: var(--text-size-md);
    font-weight: var(--weight-semibold);
  }

  .note {
    margin: var(--space-1) 0 var(--space-3);
  }

  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  button {
    display: flex;
    width: 100%;
    min-height: calc(var(--control-height) + var(--space-3));
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    border-color: transparent;
    text-align: left;
  }

  /* Locked reads as an outline only, so open lessons stand out by their fill. */
  button.locked {
    border-color: var(--separator);
    border-style: dashed;
    background: none;
  }

  /* Developer mode enables locked lessons; only a disabled one is dimmed. */
  button:disabled {
    color: var(--text-3);
  }

  .developer {
    margin: calc(-1 * var(--space-4)) 0 var(--space-5);
  }

  button[aria-current="true"] {
    border-color: var(--accent);
  }

  .state {
    color: var(--text-2);
  }

  .state.current {
    color: var(--accent);
  }
</style>
