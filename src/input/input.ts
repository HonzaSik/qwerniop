import { createTranslator, type InputOptions } from "./translate";

const CONTROLS = "a, button, input, select, textarea, summary";

/**
 * Captures typing from a textarea the caller renders and hides. Attach once per passage.
 * Returns a function that removes the listeners.
 */
export function attachInput(
  textarea: HTMLTextAreaElement,
  options: InputOptions,
): () => void {
  const translator = createTranslator({
    ...options,
    onPausedChange(paused) {
      if (!paused) {
        // A composition abandoned on blur may never end, so nothing else clears its text.
        textarea.value = "";
        textarea.focus({ preventScroll: true });
      }
      options.onPausedChange(paused);
    },
  });
  const controller = new AbortController();
  const { signal } = controller;

  // Browser text helpers would change what the learner typed before it reaches beforeinput.
  textarea.autocomplete = "off";
  textarea.autocapitalize = "off";
  textarea.spellcheck = false;
  textarea.setAttribute("autocorrect", "off");

  // Characters come from beforeinput, never keydown: dead keys report "Dead" there and layouts differ.
  textarea.addEventListener(
    "beforeinput",
    (event) => {
      if (translator.beforeInput(event)) event.preventDefault();
    },
    { signal },
  );
  textarea.addEventListener(
    "compositionstart",
    () => translator.compositionStart(),
    { signal },
  );
  textarea.addEventListener(
    "compositionend",
    (event) => {
      translator.compositionEnd(event);
      // A composition cannot be prevented, so its text lands in the textarea.
      textarea.value = "";
      // A blur that ended the composition fires in this same task, and a microtask would run before it.
      setTimeout(translator.flush);
    },
    { signal },
  );
  textarea.addEventListener(
    "blur",
    (event) => translator.pause(event.timeStamp),
    { signal },
  );

  // On the document: after focus loss the textarea no longer receives these.
  document.addEventListener(
    "keydown",
    (event) => {
      // Paused with focus on a link or a control: the key is for that control.
      if (
        event.target instanceof Element &&
        event.target !== textarea &&
        event.target.closest(CONTROLS) !== null
      ) {
        return;
      }
      if (translator.keyDown(event)) event.preventDefault();
    },
    { signal },
  );
  document.addEventListener(
    "click",
    (event) => translator.resume(event.timeStamp),
    { signal },
  );

  textarea.focus({ preventScroll: true });
  return () => controller.abort();
}
