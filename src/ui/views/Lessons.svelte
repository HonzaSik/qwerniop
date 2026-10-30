<script lang="ts">
import type { Layout } from "../../core/layouts/layout";
import {
  isUnlocked,
  type Lesson,
  type LessonTrack,
  lessonCount,
  lessonKeys,
  type Progress,
  TRACKS,
} from "../../core/lessons/lessons";
import { tracksOpen, tracksStart } from "../../core/lessons/tracks";

interface Props {
  layout: Layout["id"];
  progress: Progress;
  current: Lesson;
  onstart: (lesson: Lesson) => void;
}

let { layout, progress, current, onstart }: Props = $props();

const NAMES: Record<LessonTrack, string> = {
  letters: "Letters",
  punctuation: "Punctuation",
  numbers: "Numbers",
  code: "Code",
};

const stages = (track: LessonTrack) =>
  Array.from({ length: lessonCount(layout, track) }, (_, i) => i + 1);

const isOpen = (track: LessonTrack) =>
  track === "letters" || tracksOpen(layout, progress.letters);

function label(track: LessonTrack, stage: number): string {
  const keys = lessonKeys(layout, { track, stage });
  const noun = track === "letters" ? "Lesson" : NAMES[track];
  return `${noun} ${stage}${keys ? ` · ${keys}` : ""}`;
}
</script>

<main aria-label="Lessons">
  {#each TRACKS as track}
    <section aria-labelledby="track-{track}">
      <h2 id="track-{track}">{NAMES[track]}</h2>
      {#if isOpen(track)}
        <p class="note">Unlocked {progress[track]} of {lessonCount(layout, track)}</p>
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
                {label(track, stage)}
                {#if open && stage < progress[track]}<span class="state">Done</span>{/if}
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="note">Opens at letter lesson {tracksStart(layout)}</p>
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
    padding: var(--space-6) var(--space-4);
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
    box-sizing: border-box;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border: 1px solid transparent;
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: var(--text-size-sm);
    text-align: left;
  }

  button:disabled {
    background: none;
    border-color: var(--separator);
    color: var(--text-2);
  }

  button[aria-current="true"] {
    border-color: var(--accent);
  }

  .state {
    color: var(--text-2);
  }

  button:focus-visible {
    outline: var(--focus-ring-width) solid var(--accent);
    outline-offset: var(--focus-ring-width);
  }
</style>
