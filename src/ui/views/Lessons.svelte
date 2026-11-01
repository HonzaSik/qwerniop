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
import { lessonTitle, t } from "../strings";

interface Props {
  layout: Layout["id"];
  progress: Progress;
  current: Lesson;
  onstart: (lesson: Lesson) => void;
}

let { layout, progress, current, onstart }: Props = $props();

const stages = (track: LessonTrack) =>
  Array.from({ length: lessonCount(layout, track) }, (_, i) => i + 1);

const isOpen = (track: LessonTrack) =>
  track === "letters" || tracksOpen(layout, progress.letters);
</script>

<main aria-label={t.nav.lessons}>
  <h1>{t.nav.lessons}</h1>
  {#each TRACKS as track}
    <section aria-labelledby="track-{track}">
      <h2 id="track-{track}">{t.trackNames[track]}</h2>
      {#if isOpen(track)}
        <p class="note">{t.lessons.unlocked(progress[track], lessonCount(layout, track))}</p>
        <ul>
          {#each stages(track) as stage}
            {@const lesson = { track, stage }}
            {@const open = isUnlocked(layout, progress, lesson)}
            <li>
              <button
                type="button"
                disabled={!open}
                aria-current={current.track === track && current.stage === stage}
                onclick={() => onstart(lesson)}
              >
                {lessonTitle(layout, lesson)}
                {#if open && stage < progress[track]}<span class="state">{t.lessons.done}</span>{/if}
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="note">{t.lessons.opensAt(tracksStart(layout) ?? 1)}</p>
      {/if}
    </section>
  {/each}
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

  h2 {
    margin: 0;
    font-size: var(--text-size-md);
    font-weight: var(--weight-semibold);
  }

  .note {
    margin: var(--space-1) 0 var(--space-3);
    color: var(--text-2);
    font-size: var(--text-size-sm);
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
  button:disabled {
    border-color: var(--separator);
    border-style: dashed;
    background: none;
    color: var(--text-3);
  }

  button[aria-current="true"] {
    border-color: var(--accent);
  }

  .state {
    color: var(--text-2);
  }
</style>
