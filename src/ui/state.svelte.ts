import {
  initialProgress,
  type Lesson,
  type Progress,
} from "../core/lessons/lessons";

export type KeyboardMode = "fingers" | "next" | "hidden";

export const KEYBOARD_MODES: readonly { value: KeyboardMode; label: string }[] =
  [
    { value: "fingers", label: "Finger colours" },
    { value: "next", label: "Next key only" },
    { value: "hidden", label: "Hidden" },
  ];

export type SessionLength =
  | { kind: "words"; amount: number }
  | { kind: "seconds"; amount: number };

export const SESSION_LENGTHS: readonly SessionLength[] = [
  { kind: "words", amount: 15 },
  { kind: "words", amount: 30 },
  { kind: "words", amount: 60 },
  { kind: "seconds", amount: 30 },
  { kind: "seconds", amount: 60 },
  { kind: "seconds", amount: 120 },
];

export const lengthLabel = (l: SessionLength): string =>
  `${l.amount} ${l.kind === "words" ? "words" : "s"}`;

// Milestone 6 moves keyboardMode and length into persisted Settings and progress into the progress store.
export const ui: {
  keyboardMode: KeyboardMode;
  length: SessionLength;
  progress: Progress;
  lesson: Lesson;
} = $state({
  keyboardMode: "fingers",
  length: { kind: "words", amount: 30 },
  progress: initialProgress(),
  lesson: { track: "letters", stage: 1 },
});
