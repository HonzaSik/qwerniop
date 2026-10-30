<script lang="ts">
import type { Session } from "../../core/engine/engine";
import { caretMotion } from "./caret-motion";

interface Props {
  session: Session;
  connect: (move: () => void) => void;
}

let { session, connect }: Props = $props();
</script>

<span class="caret" aria-hidden="true" use:caretMotion={{ session, connect }}></span>

<style>
  .caret {
    position: absolute;
    top: calc((1lh - var(--caret-height)) / 2);
    left: calc(var(--caret-width) / -2);
    width: var(--caret-width);
    height: var(--caret-height);
    background: var(--accent);
    /* Keeps the text from repainting each time the caret starts a glide. */
    will-change: transform;
  }

  @media (prefers-reduced-motion: no-preference) {
    .caret {
      transition: transform var(--duration-caret) var(--ease);
      animation: caret-blink var(--caret-blink) step-end
        calc(var(--caret-blink) / 2) infinite;
    }

    /* Global because the action adds this class, so Svelte sees no element that has it. */
    .caret:global(.restart) {
      animation-name: caret-blink-restart;
    }
  }

  /* Two identical sets, because only a change of name restarts an animation. */
  @keyframes caret-blink {
    0% {
      opacity: 0;
    }
    50%,
    100% {
      opacity: 1;
    }
  }

  @keyframes caret-blink-restart {
    0% {
      opacity: 0;
    }
    50%,
    100% {
      opacity: 1;
    }
  }
</style>
