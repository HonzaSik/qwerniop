import type { Layout } from "../../core/layouts/layout";
import { strokesFor } from "../../core/layouts/strokes";

export interface KeyElement {
  classList: { add(name: string): void; remove(name: string): void };
}

/**
 * Class toggles on the static keyboard DOM, so a keystroke never re-renders it (PERFORMANCE.md).
 * A dead-key character highlights its strokes one at a time: the dead key (and its Shift) first,
 * then the base letter once the dead key goes down.
 */
export function createHighlighter(
  layout: Layout,
  keys: ReadonlyMap<string, KeyElement>,
) {
  let lit: KeyElement[] = [];
  let held: KeyElement[] = [];
  let strokes: ReturnType<typeof strokesFor>;
  let done = 0;

  function paint(): void {
    for (const el of lit) el.classList.remove("next");
    lit = [];
    const stroke = strokes?.[done];
    if (!stroke) return;
    for (const code of [stroke.shift, stroke.code]) {
      const el = code ? keys.get(code) : undefined;
      if (el) {
        el.classList.add("next");
        lit.push(el);
      }
    }
  }

  function hold(code: string, name: string): void {
    const el = keys.get(code);
    if (el) {
      el.classList.add(name);
      held.push(el);
    }
  }

  return {
    /** The character to type next; undefined when there is none. */
    next(char: string | undefined): void {
      strokes = char === undefined ? undefined : strokesFor(layout, char);
      done = 0;
      paint();
    },
    keyDown(code: string): void {
      hold(code, "pressed");
      if (
        strokes &&
        strokes[done]?.code === code &&
        done + 1 < strokes.length
      ) {
        done++;
        paint();
      }
    },
    /** Flashes the key that was actually pressed, until it is released. */
    wrong(code: string): void {
      hold(code, "wrong");
    },
    release(code?: string): void {
      const el = code === undefined ? undefined : keys.get(code);
      const rest: KeyElement[] = [];
      for (const h of held) {
        if (code === undefined || h === el) {
          h.classList.remove("pressed");
          h.classList.remove("wrong");
        } else rest.push(h);
      }
      held = rest;
    },
  };
}
