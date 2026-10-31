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
import { TARGET_ACCURACIES, TARGET_WPMS } from "../../core/settings/settings";
import { saveSettings, ui } from "../state.svelte";
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
  <!-- Temporary until the Settings view exists. -->
  <div class="targets">
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
  </div>
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
    padding: var(--space-6) var(--space-4);
  }

  .targets {
    display: flex;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
    color: var(--text-2);
    font-size: var(--text-size-sm);
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
</style>
