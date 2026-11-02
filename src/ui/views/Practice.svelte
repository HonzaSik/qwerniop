<script lang="ts">
import {
  apply,
  createSession,
  type ErrorMode,
  expire,
  type Session,
} from "../../core/engine/engine";
import { accuracy, netWpm } from "../../core/engine/results";
import { layoutById } from "../../core/layouts/registry";
import type { DailyResult } from "../../core/stats/daily";
import { attachInput } from "../../input/input";
import { isPhysicalCode } from "../../input/physicalKey";
import Keyboard from "../components/Keyboard.svelte";
import { formatAccuracy } from "../components/session-summary";
import TextView from "../components/TextView.svelte";
import type { SummaryPet } from "../pet-summary";
import {
  KEYBOARD_MODES,
  saveSettings,
  savesSessions,
  ui,
} from "../state.svelte";
import { t } from "../strings";

interface Props {
  text: string;
  /** Names the lesson above the text, as in "Lesson 5 · e i". */
  title: string;
  errorMode: ErrorMode;
  /** Milliseconds; absent for a session that ends with the text. */
  timeLimit?: number | undefined;
  /** Runs once when a session ends, whether the text ran out or the clock did. */
  onfinish: (session: Session) => void;
  /** Weakest-key labels and a sentence, set by the parent once onfinish has run. */
  feedback?:
    | {
        weakest: string[];
        sentence: string;
        recap?: string | undefined;
        pet?: SummaryPet | undefined;
        daily?: DailyResult | undefined;
        change?: number | undefined;
      }
    | undefined;
  onnext: () => void;
  ondrill: (labels: readonly string[]) => void;
}

let {
  text,
  title,
  errorMode,
  timeLimit,
  onfinish,
  feedback,
  onnext,
  ondrill,
}: Props = $props();

// Fetched as the view opens, so it is there when a session ends yet stays off the first page load's budget.
const summaryView = import("../components/SessionSummary.svelte");

// Raw: a deep proxy would make every keystroke reactive. Only a new session is a change.
let session = $state.raw(newSession());
let finished = $state(false);
let paused = $state(false);
// Only the first keystroke writes it, so the hint costs the keystroke path one boolean check.
let started = $state(false);
let greet = $state(true);
// Whole seconds only, so the readout changes once a second and never touches the text.
let secondsLeft = $state(fullSeconds());
let pausedTotal = 0;
let pausedSince = 0;
let stop: (() => void) | undefined;
let view: TextView | undefined;
let board: Keyboard | undefined = $state();
// Keydown precedes the input it produces, so this is the key behind a wrong character.
let lastCode = "";
// Mirrors data-typing so a keystroke only reads a boolean; the DOM is written when typing starts or stops.
let typing = false;

function setTyping(value: boolean): void {
  if (typing === value) return;
  typing = value;
  document.documentElement.toggleAttribute("data-typing", value);
}

let needsKeyboard = $state(
  matchMedia("(pointer: coarse) and (hover: none)").matches,
);

// Listens only until the first physical key, so a keyboard-equipped device pays nothing afterwards.
$effect(() => {
  if (!needsKeyboard) return;
  const controller = new AbortController();
  document.addEventListener(
    "keydown",
    (e) => {
      if (!isPhysicalCode(e.code)) return;
      needsKeyboard = false;
      controller.abort();
    },
    { signal: controller.signal },
  );
  return () => controller.abort();
});

// Runs for a new session and when the board mounts (hidden mode off); keystrokes call next() directly.
$effect(() => {
  board?.next(session.chars[session.cursor]?.expected);
});

function fullSeconds(): number {
  return Math.ceil((timeLimit ?? 0) / 1000);
}

function newSession() {
  return createSession({ text, errorMode, timeLimit });
}

function restart(): void {
  greet = true;
  session = newSession();
  finished = false;
  started = false;
  secondsLeft = fullSeconds();
  pausedTotal = 0;
  live = "";
}

// The input stays attached and its clock keeps the time paused so far, so pausedTotal stays too.
function startOver(): void {
  greet = true;
  session = newSession();
  started = false;
  secondsLeft = fullSeconds();
  live = "";
}

function end(): void {
  // Removing the focused textarea fires blur during Svelte's update, where a pause may not set state.
  stop?.();
  finished = true;
  onfinish(session);
}

// Clamped: a keydown can come a moment before the input that started the clock, and an idle pause dates from the keydown.
function secondsAt(at: number): number {
  const elapsed = Math.max(0, at - (session.startedAt ?? at));
  return Math.ceil(((timeLimit ?? 0) - elapsed) / 1000);
}

// One slow interval, not per keystroke. Keystroke times are timeStamp minus paused time, so this clock is too.
$effect(() => {
  if (timeLimit === undefined || finished) return;
  const id = setInterval(() => {
    if (paused) return;
    const at = performance.now() - pausedTotal;
    if (expire(session, at)) end();
    else if (session.startedAt !== undefined) {
      secondsLeft = secondsAt(at);
    }
  }, 250);
  return () => clearInterval(id);
});

// A slow readout off the keystroke path; empty until the first key so it never shows 0 wpm.
let live = $state("");
$effect(() => {
  if (!ui.settings.liveStats || finished) return;
  const id = setInterval(() => {
    if (session.startedAt === undefined) return;
    live = `${t.lessons.wpm(Math.round(netWpm(session)))} · ${formatAccuracy(accuracy(session))}`;
  }, 500);
  return () => clearInterval(id);
});

function capture(textarea: HTMLTextAreaElement): { destroy: () => void } {
  const destroy = attachInput(textarea, {
    enterTypesNewline: text.includes("\n"),
    emit(event) {
      setTyping(true);
      if (!started) {
        started = true;
        greet = false;
      }
      const logged = session.log.length;
      view?.update(apply(session, event));
      if (
        session.log.length > logged &&
        session.log.at(-1)?.correct === false
      ) {
        board?.wrong(lastCode);
      }
      board?.next(session.chars[session.cursor]?.expected);
      if (session.finishedAt !== undefined) {
        end();
      }
    },
    onKeyDown(code) {
      lastCode = code;
      board?.keyDown(code);
    },
    onComposingChange() {},
    onPausedChange(value, at) {
      if (value) setTyping(false);
      if (value) pausedSince = at;
      else pausedTotal += at - pausedSince;
      // An idle pause reaches back past what the readout showed, so it must not wait for the next tick.
      if (value && timeLimit !== undefined && session.startedAt !== undefined) {
        secondsLeft = secondsAt(at - pausedTotal);
      }
      // Later: removing the focused textarea fires blur during Svelte's update, where state may not change.
      queueMicrotask(() => {
        paused = value;
      });
    },
  });
  // Blur is what pauses, so Esc needs no pause path of its own.
  const onEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") textarea.blur();
  };
  textarea.addEventListener("keydown", onEscape);
  stop = () => {
    setTyping(false);
    textarea.removeEventListener("keydown", onEscape);
    destroy();
  };
  return { destroy: () => stop?.() };
}
</script>

<main aria-label={t.nav.practice}>
  {#if greet && savesSessions()}
    {#await import("../components/PetGreeting.svelte") then { default: PetGreeting }}
      <PetGreeting />
    {/await}
  {/if}
  <h1 class:done={finished}>{title}</h1>
  {#if timeLimit !== undefined}
    <p class="timer" role="timer" aria-label={t.practice.timeLeft}>{secondsLeft}</p>
  {/if}
  {#if needsKeyboard}
    <p class="notice" role="status">{t.practice.connectKeyboard}</p>
  {/if}
  <div class="stage">
    <div class="layer text" class:done={finished} aria-hidden={finished}>
      <TextView bind:this={view} {session} />
      {#if !finished}
        <textarea aria-label={t.practice.typeText} aria-describedby="passage" use:capture></textarea>
      {/if}
      <p class="pause" role="status">
        {#if paused}{t.practice.paused}{:else if !started && !needsKeyboard}{t.practice.startHint}{/if}
      </p>
    </div>
    <!-- Stays mounted: a live region must exist before its content arrives. -->
    <div class="layer" aria-live="polite">
      {#if finished}
        {#await summaryView then { default: SessionSummary }}
          <SessionSummary {session} {feedback} onrestart={restart} {onnext} {ondrill} />
        {:catch}
          <p>{t.summary.loadFailed}</p>
        {/await}
      {/if}
    </div>
  </div>
  {#if ui.settings.keyboardMode !== "hidden"}
    <div class="board"><Keyboard bind:this={board} layout={layoutById(ui.settings.layout)} mode={ui.settings.keyboardMode} /></div>
  {/if}
  {#if ui.settings.liveStats && !finished}
    <p class="live">{live}</p>
  {/if}
  <div class="controls">
    <label class="mode">
      {t.keyboardLabel}
      <select
        value={ui.settings.keyboardMode}
        onchange={(e) => {
          const mode = KEYBOARD_MODES[e.currentTarget.selectedIndex];
          if (mode) {
            ui.settings.keyboardMode = mode;
            saveSettings();
          }
        }}
      >
        {#each KEYBOARD_MODES as m}<option value={m}>{t.keyboardModes[m]}</option>{/each}
      </select>
    </label>
    {#if paused && started}
      <button type="button" class="over" onclick={startOver}>{t.practice.startOver}</button>
    {/if}
  </div>
</main>

<style>
  main {
    display: grid;
    box-sizing: border-box;
    min-height: 100vh;
    padding: var(--space-4);
    place-content: center stretch;
  }

  .board {
    display: flex;
    justify-content: center;
    margin-top: var(--space-6);
  }

  .mode {
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  select {
    margin-left: var(--space-2);
  }

  /* The timer stays readable: in a timed session it is part of the task, not chrome. */
  :global(:root[data-typing]) :is(h1, .mode) {
    opacity: var(--chrome-typing-opacity);
  }

  :global(:root:not([data-reduce-motion])) :is(h1, .mode) {
    transition: opacity var(--duration-view) var(--ease);
  }

  h1 {
    margin: 0 0 var(--space-4);
    color: var(--text-2);
    font-size: var(--text-size-md);
    font-weight: var(--weight-regular);
    text-align: center;
  }

  /* The summary is taller than the text, and on a short window it pushes the title under the fixed nav. */
  h1.done {
    opacity: 0;
  }

  .timer {
    margin: 0 0 var(--space-4);
    color: var(--text-2);
    font-size: var(--text-size-md);
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .stage {
    display: grid;
    justify-items: center;
  }

  .layer {
    position: relative;
    grid-area: 1 / 1;
    min-width: 0;
    max-width: 100%;
  }

  .text.done {
    opacity: 0;
    pointer-events: none;
  }

  :global(:root:not([data-reduce-motion])) .text {
    transition: opacity var(--duration-view) var(--ease);
  }

  textarea {
    position: absolute;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    padding: 0;
    border: 0;
    clip-path: inset(50%);
    resize: none;
  }

  /* Holds its line before the first key, so the readout appearing shifts nothing. */
  .live {
    min-height: 1lh;
    margin: var(--space-4) 0 0;
    color: var(--text-2);
    font-size: var(--text-size-md);
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .notice {
    margin: 0 0 var(--space-4);
    color: var(--text-2);
    font-size: var(--text-size-md);
    text-align: center;
  }

  .controls {
    position: relative;
    justify-self: center;
    margin-top: var(--space-5);
  }

  /* Out of the flow: the page is centred, so any added height would move the keyboard. */
  .over {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: var(--space-3);
  }

  .pause {
    /* Always holds its line, so the message shifts nothing when it appears. */
    min-height: 1lh;
    margin: var(--space-4) 0 0;
    color: var(--text-2);
    font-size: var(--text-size-md);
    text-align: center;
  }
</style>
