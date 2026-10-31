<script lang="ts">
import {
  apply,
  createSession,
  type ErrorMode,
  expire,
  type Session,
} from "../../core/engine/engine";
import { layoutById } from "../../core/layouts/registry";
import { attachInput } from "../../input/input";
import { isPhysicalCode } from "../../input/physicalKey";
import Keyboard from "../components/Keyboard.svelte";
import SessionSummary from "../components/SessionSummary.svelte";
import TextView from "../components/TextView.svelte";
import { KEYBOARD_MODES, saveSettings, ui } from "../state.svelte";
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
    | { weakest: string[]; sentence: string; recap?: string | undefined }
    | undefined;
  onnext: () => void;
}

let { text, title, errorMode, timeLimit, onfinish, feedback, onnext }: Props =
  $props();

// Raw: a deep proxy would make every keystroke reactive. Only a new session is a change.
let session = $state.raw(newSession());
let finished = $state(false);
let paused = $state(false);
// Whole seconds only, so the readout changes once a second and never touches the text.
let secondsLeft = $state(fullSeconds());
let pausedTotal = 0;
let pausedSince = 0;
let stop: (() => void) | undefined;
let view: TextView | undefined;
let board: Keyboard | undefined = $state();
// Keydown precedes the input it produces, so this is the key behind a wrong character.
let lastCode = "";

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
  session = newSession();
  finished = false;
  secondsLeft = fullSeconds();
  pausedTotal = 0;
}

function end(): void {
  // Removing the focused textarea fires blur during Svelte's update, where a pause may not set state.
  stop?.();
  finished = true;
  onfinish(session);
}

// One slow interval, not per keystroke. Keystroke times are timeStamp minus paused time, so this clock is too.
$effect(() => {
  if (timeLimit === undefined || finished) return;
  const id = setInterval(() => {
    if (paused) return;
    const at = performance.now() - pausedTotal;
    if (expire(session, at)) end();
    else if (session.startedAt !== undefined) {
      secondsLeft = Math.ceil((timeLimit - (at - session.startedAt)) / 1000);
    }
  }, 250);
  return () => clearInterval(id);
});

function capture(textarea: HTMLTextAreaElement): { destroy: () => void } {
  const destroy = attachInput(textarea, {
    enterTypesNewline: text.includes("\n"),
    emit(event) {
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
    onPausedChange(value) {
      if (value) pausedSince = performance.now();
      else pausedTotal += performance.now() - pausedSince;
      paused = value;
    },
  });
  // Blur is what pauses, so Esc needs no pause path of its own.
  const onEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") textarea.blur();
  };
  textarea.addEventListener("keydown", onEscape);
  stop = () => {
    textarea.removeEventListener("keydown", onEscape);
    destroy();
  };
  return { destroy: () => stop?.() };
}
</script>

<main aria-label={t.nav.practice}>
  <h1>{title}</h1>
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
        {#if paused}{t.practice.paused}{/if}
      </p>
    </div>
    <!-- Stays mounted: a live region must exist before its content arrives. -->
    <div class="layer" aria-live="polite">
      {#if finished}
        <SessionSummary {session} {feedback} onrestart={restart} {onnext} />
      {/if}
    </div>
  </div>
  {#if ui.settings.keyboardMode !== "hidden"}
    <div class="board"><Keyboard bind:this={board} layout={layoutById(ui.settings.layout)} mode={ui.settings.keyboardMode} /></div>
  {/if}
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
    justify-self: center;
    margin-top: var(--space-4);
    color: var(--text-2);
    font-size: var(--text-size-sm);
  }

  select {
    margin-left: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--separator);
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--text);
    font: inherit;
  }

  h1 {
    margin: 0 0 var(--space-4);
    color: var(--text-2);
    font-size: var(--text-size-md);
    font-weight: var(--weight-regular);
    text-align: center;
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

  .notice {
    margin: 0 0 var(--space-4);
    color: var(--text-2);
    font-size: var(--text-size-md);
    text-align: center;
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
