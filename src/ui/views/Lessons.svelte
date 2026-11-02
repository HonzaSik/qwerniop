<script lang="ts">
import { untrack } from "svelte";
import type { MissRate } from "../../core/adaptive/mistakes";
import type { Layout } from "../../core/layouts/layout";
import {
  isUnlocked,
  type Lesson,
  type LessonTrack,
  lessonCount,
  type Progress,
  TRACKS,
  unlockStatus,
} from "../../core/lessons/lessons";
import { tracksOpen, tracksStart } from "../../core/lessons/tracks";
import CustomTextSection from "../components/CustomTextSection.svelte";
import PetStreak from "../components/PetStreak.svelte";
import Tabs from "../components/Tabs.svelte";
import TopicSection from "../components/TopicSection.svelte";
import WeakKeysSection from "../components/WeakKeysSection.svelte";
import type { PetStatus } from "../pet-status";
import { ui } from "../state.svelte";
import { lessonParts, lessonTitle, t } from "../strings";

interface Props {
  layout: Layout["id"];
  progress: Progress;
  current: Lesson;
  onstart: (lesson: Lesson) => void;
  onstarttopic: (topic: string, signal: AbortSignal) => Promise<boolean>;
  onstartcustom: (text: string) => void;
  customDraft: string;
  weak: readonly MissRate[];
  onstartweak: () => void;
  petStatus: PetStatus | null;
}

let {
  layout,
  progress,
  current,
  onstart,
  onstarttopic,
  onstartcustom,
  customDraft = $bindable(),
  weak,
  onstartweak,
  petStatus,
}: Props = $props();

// Only where the view opens: picking a tab must not follow the current lesson afterwards.
let track = $state<LessonTrack>(untrack(() => current.track));

const stages = (of: LessonTrack) =>
  Array.from({ length: lessonCount(layout, of) }, (_, i) => i + 1);

const tracksReached = (of: LessonTrack) =>
  of === "letters" || tracksOpen(layout, progress.letters);

// A closed track keeps a stored count of 1, but nothing in it is unlocked yet.
const unlockedCount = (of: LessonTrack) =>
  tracksReached(of) ? progress[of] : 0;

const isOpen = (of: LessonTrack) =>
  ui.settings.developerMode || tracksReached(of);

const all = $derived(lessonCount(layout, track));
// A closed track's lesson, started in developer mode, is not on the way to any unlock.
const unlock = $derived(
  isUnlocked(layout, progress, current)
    ? unlockStatus(layout, progress, current.track, ui.settings.targets)
    : undefined,
);
const nextTitle = $derived(
  lessonTitle(layout, {
    track: current.track,
    stage: progress[current.track] + 1,
  }),
);
</script>

<main aria-label={t.nav.lessons}>
  <h1>{t.nav.lessons}</h1>
  {#if ui.settings.developerMode}<p class="note developer">{t.lessons.developerMode}</p>{/if}
  <section class="next" aria-labelledby="next-up">
    <div>
      <p class="label">{t.lessons.nextUp}</p>
      <h2 id="next-up">{lessonTitle(layout, current)}</h2>
      {#if unlock}
        {#if unlock.missing.length > 0}
          <p class="note">{t.lessons.unlockProgress(unlock.total - unlock.missing.length, unlock.total, nextTitle)}</p>
          <p class="note missing">
            {t.lessons.stillNeeds}
            {#each unlock.missing as key}{" "}<kbd>{key}</kbd>{/each}
          </p>
        {:else}
          <p class="note">{t.lessons.unlockReady(nextTitle)}</p>
        {/if}
      {/if}
    </div>
    <button type="button" class="primary" onclick={() => onstart(current)}>{t.summary.next}</button>
  </section>
  <div class="columns">
    <div>
      <Tabs
        label={t.lessons.tracks}
        tabs={TRACKS.map((id) => ({ id, label: t.trackNames[id] }))}
        bind:selected={track}
      >
        {#if isOpen(track)}
          <div class="progress">
            <div
              class="bar"
              role="progressbar"
              aria-label={t.trackNames[track]}
              aria-valuemin={0}
              aria-valuemax={all}
              aria-valuenow={unlockedCount(track)}
              aria-valuetext={t.lessons.unlocked(unlockedCount(track), all)}
            >
              <div style:width="{(unlockedCount(track) / all) * 100}%"></div>
            </div>
            <span class="note">{t.lessons.count(unlockedCount(track), all)}</span>
          </div>
          <ul>
            {#each stages(track) as stage}
              {@const lesson = { track, stage }}
              {@const unlocked = isUnlocked(layout, progress, lesson)}
              {@const open = unlocked || ui.settings.developerMode}
              {@const isCurrent = current.track === track && current.stage === stage}
              {@const parts = lessonParts(layout, lesson)}
              <li>
                <button
                  type="button"
                  disabled={!open}
                  class:locked={!unlocked}
                  aria-current={isCurrent}
                  onclick={() => onstart(lesson)}
                >
                  <span class="name">
                    {parts.name}
                    {#if isCurrent}<span class="state current">{t.lessons.current}</span>
                    {:else if unlocked && stage < progress[track]}<span class="state">{t.lessons.done}</span>{/if}
                  </span>
                  <span class="keys">{parts.keys}</span>
                </button>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="note">{t.lessons.opensAt(tracksStart(layout) ?? 1)}</p>
        {/if}
      </Tabs>
    </div>
    <aside>
      <WeakKeysSection {weak} onstart={onstartweak} />
      <CustomTextSection {layout} onstart={onstartcustom} bind:draft={customDraft} />
      <TopicSection {layout} letters={progress.letters} onstart={onstarttopic} />
    </aside>
  </div>
  {#if petStatus}<PetStreak pet={petStatus.pet} streak={petStatus.streak} />{/if}
</main>

<style>
  main {
    box-sizing: border-box;
    width: min(100%, var(--page-column));
    min-height: 100vh;
    margin: 0 auto;
    padding: calc(var(--space-8) + var(--space-4)) var(--space-4) var(--space-6);
  }

  h1 {
    margin: 0 0 var(--space-5);
    font-size: var(--text-size-xl);
    font-weight: var(--weight-semibold);
  }

  .developer {
    margin: calc(-1 * var(--space-3)) 0 var(--space-5);
  }

  .next {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3) var(--space-5);
    margin-bottom: var(--space-6);
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-group);
    background: var(--surface);
  }

  .label {
    margin: 0;
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  h2 {
    margin: var(--space-1) 0 var(--space-2);
    font-size: var(--text-size-lg);
    font-weight: var(--weight-semibold);
  }

  .note {
    margin: var(--space-1) 0 0;
  }

  .missing {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1);
  }

  /* On a surface group the keycaps sit on the window colour, so they still read as raised. */
  .missing kbd {
    background: var(--bg);
  }

  .columns {
    display: grid;
    gap: var(--space-6);
  }

  .progress {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .progress .note {
    margin: 0;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .bar {
    flex: 1;
    height: var(--space-1);
    overflow: hidden;
    border-radius: var(--radius-key);
    background: var(--surface);
  }

  .bar > div {
    height: 100%;
    background: var(--accent);
  }

  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  ul button {
    display: grid;
    width: 100%;
    height: 100%;
    align-content: start;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    border-color: transparent;
    text-align: left;
  }

  .name {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    color: var(--text-2);
  }

  .keys {
    color: var(--text);
    font-family: var(--font-practice);
    font-size: var(--text-size-md);
  }

  /* Locked reads as an outline only, so open lessons stand out by their fill. */
  button.locked {
    border-color: var(--separator);
    border-style: dashed;
    background: none;
  }

  /* Developer mode enables locked lessons; only a disabled one is dimmed. */
  button:disabled .name,
  button:disabled .keys {
    color: var(--text-3);
  }

  button[aria-current="true"] {
    border-color: var(--accent);
  }

  .state.current {
    color: var(--accent);
  }

  @media (min-width: 900px) {
    .columns {
      grid-template-columns: minmax(0, 1fr) var(--side-column);
      align-items: start;
    }

    aside {
      padding-left: var(--space-6);
      border-left: 1px solid var(--separator);
    }
  }

  /* Keeps the corner pet off the content when the centred column would reach it. */
  @media (width >= 1100px) {
    main {
      padding-left: max(
        var(--space-4),
        calc(
          var(--pet-corner-width) - max(0px, (100vw - var(--page-column)) / 2)
        )
      );
    }
  }
</style>
