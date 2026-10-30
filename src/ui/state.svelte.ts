export type KeyboardMode = "fingers" | "next" | "hidden";

export const KEYBOARD_MODES: readonly { value: KeyboardMode; label: string }[] =
  [
    { value: "fingers", label: "Finger colours" },
    { value: "next", label: "Next key only" },
    { value: "hidden", label: "Hidden" },
  ];

// Milestone 6 moves this into persisted Settings.
export const ui: { keyboardMode: KeyboardMode } = $state({
  keyboardMode: "fingers",
});
