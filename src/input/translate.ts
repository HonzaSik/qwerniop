import type { InputEvent as SessionInput } from "../core/engine/engine";

const MODIFIER_KEYS = new Set([
  "Alt",
  "AltGraph",
  "CapsLock",
  "Control",
  "Fn",
  "Meta",
  "NumLock",
  "OS",
  "ScrollLock",
  "Shift",
]);

/** Esc is what paused the session, and Tab moves on to the controls around it. */
const STAY_PAUSED_KEYS = new Set(["Escape", "Tab"]);

/** Left to the browser while paused. AltGr types characters, and Windows reports it as Ctrl+Alt. */
function isShortcut(
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">,
): boolean {
  return (
    event.metaKey || event.ctrlKey !== event.altKey || /^F\d+$/.test(event.key)
  );
}

export interface InputOptions {
  /** Set per passage from `text.includes("\n")`; Enter does nothing otherwise. */
  enterTypesNewline: boolean;
  emit: (event: SessionInput) => void;
  onKeyDown: (code: string) => void;
  onComposingChange: (composing: boolean) => void;
  onPausedChange: (paused: boolean) => void;
}

/**
 * The input decisions, free of the DOM so they can be tested without a browser.
 * `beforeInput` and `keyDown` return whether the caller must `preventDefault()`.
 */
export function createTranslator(options: InputOptions) {
  const { enterTypesNewline, emit } = options;
  let composing = false;
  let pausedAt: number | undefined;
  let pausedMs = 0;
  // A composition's text waits here until `flush`: Chromium ends a composition on blur, committing
  // its text just before the blur event, and only what follows can tell that from a real commit.
  let committed: { data: string; timeStamp: number } | undefined;

  function emitChars(data: string, timeStamp: number): void {
    const at = timeStamp - pausedMs;
    for (const char of data.normalize("NFC")) emit({ kind: "char", char, at });
  }

  // A browser need not end a composition when focus leaves, and input stays ignored while one runs.
  function abandonComposition(): void {
    if (!composing) return;
    composing = false;
    options.onComposingChange(false);
  }

  function flush(): void {
    if (committed === undefined) return;
    const { data, timeStamp } = committed;
    committed = undefined;
    emitChars(data, timeStamp);
  }

  function resume(timeStamp: number): void {
    if (pausedAt === undefined) return;
    abandonComposition();
    pausedMs += timeStamp - pausedAt;
    pausedAt = undefined;
    options.onPausedChange(false);
  }

  return {
    beforeInput(
      event: Pick<
        globalThis.InputEvent,
        "inputType" | "data" | "isComposing" | "timeStamp"
      >,
    ): boolean {
      flush();
      // Composition updates fire for every intermediate state and cannot be cancelled in Chromium.
      if (composing || event.isComposing) return false;
      if (pausedAt !== undefined) return true;
      if (event.inputType === "insertText" && event.data !== null) {
        emitChars(event.data, event.timeStamp);
      } else if (event.inputType === "deleteContentBackward") {
        emit({ kind: "backspace", at: event.timeStamp - pausedMs });
      }
      return true;
    },

    keyDown(
      event: Pick<
        KeyboardEvent,
        | "key"
        | "code"
        | "isComposing"
        | "timeStamp"
        | "ctrlKey"
        | "metaKey"
        | "altKey"
      >,
    ): boolean {
      flush();
      options.onKeyDown(event.code);
      if (pausedAt !== undefined) {
        if (
          MODIFIER_KEYS.has(event.key) ||
          STAY_PAUSED_KEYS.has(event.key) ||
          isShortcut(event)
        ) {
          return false;
        }
        resume(event.timeStamp);
        return true;
      }
      if (event.key !== "Enter" || event.isComposing) return false;
      if (enterTypesNewline) emitChars("\n", event.timeStamp);
      return true;
    },

    compositionStart(): void {
      flush();
      composing = true;
      options.onComposingChange(true);
    },

    compositionEnd(event: Pick<CompositionEvent, "data" | "timeStamp">): void {
      // Already abandoned: a late end must not type what was left behind.
      if (!composing) return;
      composing = false;
      options.onComposingChange(false);
      if (pausedAt === undefined) {
        committed = { data: event.data, timeStamp: event.timeStamp };
      }
    },

    pause(timeStamp: number): void {
      if (pausedAt !== undefined) return;
      abandonComposition();
      committed = undefined;
      pausedAt = timeStamp;
      options.onPausedChange(true);
    },

    resume,
    flush,
  };
}
