import type { Feedback } from "../../core/adaptive/feedback";
import type { Layout } from "../../core/layouts/layout";
import { type Lesson, lessonKeys, noNewKeys } from "../../core/lessons/lessons";
import type { Language } from "../../core/settings/settings";
import { ui } from "../state.svelte";
import { cs } from "./cs";
import { en, type Strings } from "./en";

/** Czech for Czech browsers, English for everything else. */
export const pickStrings = (language: string): Strings =>
  language.toLowerCase().startsWith("cs") ? cs : en;

/** The setting decides; "system" follows the browser. */
export const stringsFor = (setting: Language, browser: string): Strings =>
  setting === "system" ? pickStrings(browser) : setting === "cs" ? cs : en;

/**
 * Reads through to the current language on every access, so a template that
 * uses `t` re-renders when the setting changes. The target only supplies the type.
 */
export const t: Strings = new Proxy(en, {
  get: (_, key) =>
    Reflect.get(stringsFor(ui.settings.language, navigator.language), key),
});

/** A lesson's two halves: "Lesson 5" and "e i", or "Numbers 2" and "6 7 8 9 0". */
export function lessonParts(
  id: Layout["id"],
  lesson: Lesson,
  s: Strings = t,
): { name: string; keys: string } {
  const note = noNewKeys(lesson);
  const noun =
    lesson.track === "letters" ? s.lesson : s.trackNames[lesson.track];
  return {
    name: `${noun} ${lesson.stage}`,
    keys: lessonKeys(id, lesson) || (note ? s.noNewKeys[note] : ""),
  };
}

/** "Lesson 5 · e i" for letters, "Numbers 2 · 6 7 8 9 0" for the other tracks. */
export function lessonTitle(
  id: Layout["id"],
  lesson: Lesson,
  s: Strings = t,
): string {
  const { name, keys } = lessonParts(id, lesson, s);
  return keys ? `${name} · ${keys}` : name;
}

export function feedbackText(f: Feedback, s: Strings = t): string {
  return f.rule === "unlocked"
    ? s.feedback.unlocked(f.title)
    : s.feedback[f.rule](f.keys);
}
