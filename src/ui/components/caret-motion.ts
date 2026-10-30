import type { Session } from "../../core/engine/engine";

// TextView sets the same number of lines as its height.
const VISIBLE_LINES = 3;

export interface CharBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Plain arrays, read on every keystroke. `lefts` and `lines` have one extra entry for the end of the text. */
export interface TextLayout {
  lefts: number[];
  lines: number[];
  lineTops: number[];
}

export function measureLayout(
  boxes: readonly CharBox[],
  originLeft: number,
): TextLayout {
  const lefts: number[] = [];
  const lines: number[] = [];
  const lineTops: number[] = [];
  const firstTop = boxes[0]?.top ?? 0;
  let lineBottom = Number.NEGATIVE_INFINITY;

  for (const box of boxes) {
    // Not a change of top: a fallback font's box starts higher on the same line.
    if ((box.top + box.bottom) / 2 > lineBottom) {
      // Whole pixels, because scrolling by a fraction blurs the text.
      lineTops.push(Math.round(box.top - firstTop));
      lineBottom = box.bottom;
    }
    lefts.push(box.left - originLeft);
    lines.push(lineTops.length - 1);
  }

  lefts.push((boxes.at(-1)?.right ?? originLeft) - originLeft);
  lines.push(Math.max(0, lineTops.length - 1));
  return { lefts, lines, lineTops };
}

export function firstVisibleLine(line: number, lineCount: number): number {
  return Math.max(0, Math.min(line - 1, lineCount - VISIBLE_LINES));
}

export function caretOffset(
  layout: TextLayout,
  index: number,
): { x: number; y: number } {
  const line = layout.lines[index] ?? 0;
  return { x: layout.lefts[index] ?? 0, y: layout.lineTops[line] ?? 0 };
}

export function scrollOffset(layout: TextLayout, index: number): number {
  const line = layout.lines[index] ?? 0;
  const first = firstVisibleLine(line, layout.lineTops.length);
  return layout.lineTops[first] ?? 0;
}

export interface CaretMotionParams {
  session: Session;
  /** Receives the function that moves the caret to `session.cursor`. */
  connect: (move: () => void) => void;
}

/** Goes on the caret, which is a child of the text after the character spans. */
export function caretMotion(
  caret: HTMLElement,
  { session, connect }: CaretMotionParams,
): { destroy: () => void } {
  const text = caret.parentElement;
  if (text === null) throw new Error("The caret has no text element");
  const spans = Array.from(text.children).slice(0, session.chars.length);
  let layout: TextLayout | undefined;
  let shownScroll = 0;

  const place = (): void => {
    if (layout === undefined) return;
    const { x, y } = caretOffset(layout, session.cursor);
    caret.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    const scroll = scrollOffset(layout, session.cursor);
    if (scroll !== shownScroll) {
      shownScroll = scroll;
      text.style.transform = `translate3d(0, ${-scroll}px, 0)`;
    }
  };

  const measure = (): void => {
    const boxes = spans.map((span) => span.getBoundingClientRect());
    layout = measureLayout(boxes, text.getBoundingClientRect().left);
    place();
  };

  connect(() => {
    // Switching keyframes restarts the blink from its solid delay, with no timer per keystroke.
    caret.classList.toggle("restart");
    place();
  });

  // Observing also fires once at the start and when a hidden view is shown again.
  const observer = new ResizeObserver(measure);
  observer.observe(text);
  // A swapped font can keep the box size and still move characters.
  document.fonts.addEventListener("loadingdone", measure);

  return {
    destroy() {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
    },
  };
}
