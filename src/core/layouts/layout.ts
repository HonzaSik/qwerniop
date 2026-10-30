export type Finger =
  | "L5"
  | "L4"
  | "L3"
  | "L2" // left pinky, ring, middle, index
  | "R2"
  | "R3"
  | "R4"
  | "R5" // right index, middle, ring, pinky
  | "T"; // thumbs

export interface KeyDef {
  code: string; // KeyboardEvent.code, e.g. "KeyA", "Digit1", "Semicolon"
  row: 0 | 1 | 2 | 3 | 4; // 0 = number row, 4 = space row
  width?: number; // in key units, default 1
  finger: Finger;
  base: string; // "" for keys that type nothing (Shift, CapsLock, Backspace)
  shift?: string; // character with Shift
  deadBase?: string; // dead key produced without Shift, e.g. "´"
  deadShift?: string; // dead key produced with Shift, e.g. "ˇ"
}

export interface Layout {
  id: "en-us" | "cs-qwertz";
  name: string;
  locale: string; // for word lists and capitalization
  keys: KeyDef[];
  compose: Record<string, Record<string, string>>; // dead key → base → result, e.g. "ˇ" → "c" → "č"
}

// Courses differ on 6; one constant keeps it a one-line change.
export const DIGIT6_FINGER: Finger = "L2";
