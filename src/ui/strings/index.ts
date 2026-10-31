import type { Feedback } from "../../core/adaptive/feedback";
import type { Layout } from "../../core/layouts/layout";
import { type Lesson, lessonKeys, noNewKeys } from "../../core/lessons/lessons";
import { cs } from "./cs";
import { en, type Strings } from "./en";

/** Czech for Czech browsers, English for everything else; there is no setting for it yet. */
export const pickStrings = (language: string): Strings =>
  language.toLowerCase().startsWith("cs") ? cs : en;

export const t: Strings = pickStrings(navigator.language);

/** "Lesson 5 · e i" for letters, "Numbers 2 · 6 7 8 9 0" for the other tracks. */
export function lessonTitle(
  id: Layout["id"],
  lesson: Lesson,
  s: Strings = t,
): string {
  const note = noNewKeys(lesson);
  const keys = lessonKeys(id, lesson) || (note ? s.noNewKeys[note] : "");
  const noun =
    lesson.track === "letters" ? s.lesson : s.trackNames[lesson.track];
  return `${noun} ${lesson.stage}${keys ? ` · ${keys}` : ""}`;
}

export function feedbackText(f: Feedback, s: Strings = t): string {
  return f.rule === "unlocked"
    ? s.feedback.unlocked(f.title)
    : s.feedback[f.rule](f.keys);
}
