import type { Finger, Layout } from "./layout";

export interface Stroke {
  code: string;
  shift: "ShiftLeft" | "ShiftRight" | null;
}

interface Derived {
  strokes: Map<string, readonly Stroke[]>;
  fingers: Map<string, Finger>;
}

const cache = new WeakMap<Layout, Derived>();

// Shift is pressed by the hand opposite the typing finger (LAYOUTS.md).
const opposite = (finger: Finger): Stroke["shift"] =>
  finger.startsWith("L") ? "ShiftRight" : "ShiftLeft";

function derive(layout: Layout): Derived {
  const strokes = new Map<string, readonly Stroke[]>();
  const fingers = new Map<string, Finger>();
  const dead = new Map<string, Stroke>();
  // Earlier passes win: a dedicated key beats a shifted or composed path.
  for (const k of layout.keys) {
    fingers.set(k.code, k.finger);
    if (k.base !== "" && !strokes.has(k.base)) {
      strokes.set(k.base, [{ code: k.code, shift: null }]);
    }
  }
  for (const k of layout.keys) {
    const shift = opposite(k.finger);
    if (k.shift && !strokes.has(k.shift)) {
      strokes.set(k.shift, [{ code: k.code, shift }]);
    }
    if (k.deadBase) dead.set(k.deadBase, { code: k.code, shift: null });
    if (k.deadShift) dead.set(k.deadShift, { code: k.code, shift });
  }
  for (const [deadChar, table] of Object.entries(layout.compose)) {
    const d = dead.get(deadChar);
    for (const [base, result] of Object.entries(table)) {
      const b = strokes.get(base);
      if (d && b?.length === 1 && b[0] && !strokes.has(result)) {
        strokes.set(result, [d, b[0]]);
      }
    }
  }
  return { strokes, fingers };
}

function derived(layout: Layout): Derived {
  let d = cache.get(layout);
  if (!d) {
    d = derive(layout);
    cache.set(layout, d);
  }
  return d;
}

/** Key presses that type `char` in order; undefined if the layout can't produce it. */
export function strokesFor(
  layout: Layout,
  char: string,
): readonly Stroke[] | undefined {
  return derived(layout).strokes.get(char);
}

export function fingerFor(layout: Layout, code: string): Finger | undefined {
  return derived(layout).fingers.get(code);
}
