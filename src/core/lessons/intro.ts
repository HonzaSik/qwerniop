import type { Finger, KeyDef, Layout } from "../layouts/layout";
import { type Stroke, strokesFor } from "../layouts/strokes";
import type { Rng } from "../text/rng";
import {
  isUnlocked,
  type Lesson,
  lessonKeys,
  noNewKeys,
  type Progress,
} from "./lessons";

/** Where each finger rests; every reach is described from here. */
export const HOME_KEYS: Record<Finger, string> = {
  L5: "KeyA",
  L4: "KeyS",
  L3: "KeyD",
  L2: "KeyF",
  R2: "KeyJ",
  R3: "KeyK",
  R4: "KeyL",
  R5: "Semicolon",
  T: "Space",
};

export interface KeyGuide {
  /** The key that types the character, last of its strokes. */
  code: string;
  finger: Finger;
  home: string;
  /** Rows from home: negative is up, toward the digits. */
  rows: number;
  side: "straight" | "left" | "right";
  shift: Stroke["shift"];
  /** A dead key pressed first, for characters such as č: its code, Shift and the mark it shows. */
  dead?: { code: string; shift: Stroke["shift"]; mark: string };
}

// Rows are staggered, so "straight up" is anything under half a key away.
const STRAIGHT = 0.5;

function centre(layout: Layout, key: KeyDef): number {
  let x = 0;
  for (const k of layout.keys) {
    if (k.row !== key.row) continue;
    if (k.code === key.code) return x + (k.width ?? 1) / 2;
    x += k.width ?? 1;
  }
  return x;
}

/** How to reach the key that types `char`; undefined if the layout cannot type it. */
export function keyGuide(layout: Layout, char: string): KeyGuide | undefined {
  const strokes = strokesFor(layout, char);
  const last = strokes?.at(-1);
  if (!strokes || !last) return undefined;
  const key = layout.keys.find((k) => k.code === last.code);
  if (!key) return undefined;
  const home = layout.keys.find((k) => k.code === HOME_KEYS[key.finger]);
  if (!home) return undefined;
  const dx = centre(layout, key) - centre(layout, home);
  const guide: KeyGuide = {
    code: key.code,
    finger: key.finger,
    home: home.code,
    rows: key.row - home.row,
    side: Math.abs(dx) < STRAIGHT ? "straight" : dx < 0 ? "left" : "right",
    shift: last.shift,
  };
  const first = strokes[0];
  const deadKey =
    strokes.length > 1 && first
      ? layout.keys.find((k) => k.code === first.code)
      : undefined;
  if (!first || !deadKey) return guide;
  // The key's printed base is empty for a dead key; the mark is what the learner looks for.
  const mark = (first.shift ? deadKey.deadShift : deadKey.deadBase) ?? "";
  return { ...guide, dead: { code: first.code, shift: first.shift, mark } };
}

/**
 * Short groups of only the new characters, each at least twice, so the drill
 * trains the new reaches and nothing else.
 */
export function keyDrill(
  chars: readonly string[],
  rng: Rng,
  words = 12,
): string {
  if (chars.length === 0) return "";
  const pick = () => chars[Math.floor(rng() * chars.length)] ?? "";
  const groups: string[] = [];
  // At least one group per character, so the guarantee below never overwrites one.
  for (let i = 0; i < Math.max(words, chars.length); i++) {
    const size = 2 + Math.floor(rng() * 3);
    groups.push(Array.from({ length: size }, pick).join(""));
  }
  // Random picks can miss a character; the first groups guarantee each one twice.
  chars.forEach((c, i) => {
    const at = i % groups.length;
    groups[at] = c + c + (groups[at] ?? "").slice(2);
  });
  return groups.join(" ");
}

/** A lesson is introduced once: when it adds keys and its stage has not been introduced yet. */
export function needsIntro(
  id: Layout["id"],
  progress: Progress,
  lesson: Lesson,
): boolean {
  return (
    noNewKeys(lesson) === undefined &&
    lessonKeys(id, lesson) !== "" &&
    lesson.stage > progress.introduced[lesson.track]
  );
}

/** Only unlocked lessons: one tried locked in developer mode must still be introduced when it unlocks. */
export function markIntroduced(
  id: Layout["id"],
  progress: Progress,
  lesson: Lesson,
): Progress {
  const seen = progress.introduced[lesson.track];
  return seen >= lesson.stage || !isUnlocked(id, progress, lesson)
    ? progress
    : {
        ...progress,
        introduced: { ...progress.introduced, [lesson.track]: lesson.stage },
      };
}
