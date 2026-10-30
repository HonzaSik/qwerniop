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

  function emitChars(data: string, timeStamp: number): void {
    const at = timeStamp - pausedMs;
    for (const char of data.normalize("NFC")) emit({ kind: "char", char, at });
  }

  function resume(timeStamp: number): void {
    if (pausedAt === undefined) return;
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
      event: Pick<KeyboardEvent, "key" | "code" | "isComposing" | "timeStamp">,
    ): boolean {
      options.onKeyDown(event.code);
      if (pausedAt !== undefined) {
        if (MODIFIER_KEYS.has(event.key)) return false;
        resume(event.timeStamp);
        return true;
      }
      if (event.key !== "Enter" || event.isComposing) return false;
      if (enterTypesNewline) emitChars("\n", event.timeStamp);
      return true;
    },

    compositionStart(): void {
      composing = true;
      options.onComposingChange(true);
    },

    compositionEnd(event: Pick<CompositionEvent, "data" | "timeStamp">): void {
      composing = false;
      options.onComposingChange(false);
      if (pausedAt === undefined) emitChars(event.data, event.timeStamp);
    },

    pause(timeStamp: number): void {
      if (pausedAt !== undefined) return;
      pausedAt = timeStamp;
      options.onPausedChange(true);
    },

    resume,
  };
}
