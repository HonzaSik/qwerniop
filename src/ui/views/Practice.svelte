<script lang="ts">
import { apply, createSession, type ErrorMode } from "../../core/engine/engine";
import { enUs } from "../../core/layouts/en-us";
import { attachInput } from "../../input/input";
import Keyboard from "../components/Keyboard.svelte";
import SessionSummary from "../components/SessionSummary.svelte";
import TextView from "../components/TextView.svelte";

interface Props {
  text: string;
  errorMode: ErrorMode;
}

let { text, errorMode }: Props = $props();

// Raw: a deep proxy would make every keystroke reactive. Only a new session is a change.
let session = $state.raw(newSession());
let finished = $state(false);
let paused = $state(false);
let view: TextView | undefined;

function newSession() {
  return createSession({ text, errorMode });
}

function restart(): void {
  session = newSession();
  finished = false;
}

function capture(textarea: HTMLTextAreaElement): { destroy: () => void } {
  const destroy = attachInput(textarea, {
    enterTypesNewline: text.includes("\n"),
    emit(event) {
      view?.update(apply(session, event));
      if (session.finishedAt !== undefined) {
        // Removing the focused textarea fires blur during Svelte's update, where a pause may not set state.
        destroy();
        finished = true;
      }
    },
    onKeyDown() {},
    onComposingChange() {},
    onPausedChange(value) {
      paused = value;
    },
  });
  return { destroy };
}
</script>

<main aria-label="Practice">
  <div class="stage">
    <div class="layer text" class:done={finished} aria-hidden={finished}>
      <TextView bind:this={view} {session} />
      {#if !finished}
        <textarea aria-label="Type the text" use:capture></textarea>
      {/if}
      <p class="pause" role="status">
        {#if paused}Click or press any key to continue{/if}
      </p>
    </div>
    <!-- Stays mounted: a live region must exist before its content arrives. -->
    <div class="layer" aria-live="polite">
      {#if finished}
        <SessionSummary {session} onrestart={restart} />
      {/if}
    </div>
  </div>
  <div class="board"><Keyboard layout={enUs} /></div>
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

  @media (prefers-reduced-motion: no-preference) {
    .text {
      transition: opacity var(--duration-view) var(--ease);
    }
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

  .pause {
    /* Always holds its line, so the message shifts nothing when it appears. */
    min-height: 1lh;
    margin: var(--space-4) 0 0;
    color: var(--text-2);
    font-size: var(--text-size-md);
    text-align: center;
  }
</style>
