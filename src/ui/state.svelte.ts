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

// Milestone 6 moves this into persisted Settings.
export const ui: { keyboardMode: KeyboardMode; length: SessionLength } = $state(
  {
    keyboardMode: "fingers",
    length: { kind: "words", amount: 30 },
  },
);
