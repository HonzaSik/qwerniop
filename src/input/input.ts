import { createTranslator, type InputOptions } from "./translate";

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
      if (!paused) textarea.focus({ preventScroll: true });
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
