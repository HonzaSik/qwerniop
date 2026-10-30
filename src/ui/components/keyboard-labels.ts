import type { KeyDef } from "../../core/layouts/layout";

// Keys that type nothing or whitespace have no printable base to show.
const NAMES: Record<string, string> = {
  Backspace: "Backspace",
  Tab: "Tab",
  CapsLock: "Caps",
  Enter: "Enter",
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
  Space: "",
};

export interface KeyLabel {
  main: string;
  shift: string; // empty unless the shifted character is not just the capital
}

export function keyLabel(key: KeyDef): KeyLabel {
  const named = NAMES[key.code];
  if (named !== undefined) return { main: named, shift: "" };
  const upper = key.base.toUpperCase();
  const shifted = key.shift !== undefined && key.shift !== upper;
  return shifted
    ? { main: key.base, shift: key.shift ?? "" }
    : { main: upper, shift: "" };
}
