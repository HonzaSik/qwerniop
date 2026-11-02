import { createTranslator, type InputOptions } from "./translate";

// Long enough not to catch someone searching for a key, short enough to spare a score from a phone call.
const IDLE_MS = 10_000;

const CONTROLS = "a, button, input, select, textarea, summary";

/**
 * Captures typing from a textarea the caller renders and hides. Attach once per passage.
 * Returns a function that removes the listeners.
 */
export function attachInput(
  textarea: HTMLTextAreaElement,
  options: InputOptions,
): () => void {
  // Nothing idles before the first character, since the clock has not started.
  let started = false;
  let lastKey = 0;
  const translator = createTranslator({
    ...options,
    emit(event) {
      started = true;
      options.emit(event);
    },
    onPausedChange(paused, at) {
      if (!paused) {
        // A click resumes with no key, and the wait so far must not pause it again at once.
        lastKey = at;
        // A composition abandoned on blur may never end, so nothing else clears its text.
        textarea.value = "";
        textarea.focus({ preventScroll: true });
      }
      options.onPausedChange(paused, at);
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
      lastKey = event.timeStamp;
      if (translator.keyDown(event)) event.preventDefault();
    },
    { signal },
  );
  document.addEventListener(
    "click",
    (event) => translator.resume(event.timeStamp),
    { signal },
  );

  // Back-dated to the last key, so the wait counts neither as typing time nor against speed.
  const idle = setInterval(() => {
    if (!started || document.activeElement !== textarea) return;
    if (performance.now() - lastKey < IDLE_MS) return;
    translator.pause(lastKey);
    textarea.blur();
  }, 1000);

  textarea.focus({ preventScroll: true });
  return () => {
    clearInterval(idle);
    controller.abort();
  };
}
