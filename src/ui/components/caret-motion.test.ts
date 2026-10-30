import { describe, expect, it } from "vitest";
import {
  type CharBox,
  caretOffset,
  firstVisibleLine,
  measureLayout,
  scrollOffset,
} from "./caret-motion";

const WIDTH = 10;
const HEIGHT = 20;
const ORIGIN_LEFT = 100;
const ORIGIN_TOP = -50;

/** One box per character, for lines given as their character counts. */
function boxesOf(lineLengths: readonly number[]): CharBox[] {
  return lineLengths.flatMap((length, line) =>
    Array.from({ length }, (_, column) => ({
      left: ORIGIN_LEFT + column * WIDTH,
      right: ORIGIN_LEFT + (column + 1) * WIDTH,
      top: ORIGIN_TOP + line * HEIGHT,
      bottom: ORIGIN_TOP + (line + 1) * HEIGHT,
    })),
  );
}

function layoutOf(lineLengths: readonly number[]) {
  return measureLayout(boxesOf(lineLengths), ORIGIN_LEFT);
}

describe("firstVisibleLine", () => {
  it("keeps the caret on the middle row once past the first line", () => {
    const tops = [0, 1, 2, 3].map((line) => firstVisibleLine(line, 6));
    expect(tops).toEqual([0, 0, 1, 2]);
  });

  it("stops scrolling so the last three lines stay filled", () => {
    expect(firstVisibleLine(4, 6)).toBe(3);
    expect(firstVisibleLine(5, 6)).toBe(3);
  });

  it("never scrolls a passage of three lines or fewer", () => {
    for (const lineCount of [1, 2, 3]) {
      for (let line = 0; line < lineCount; line++) {
        expect(firstVisibleLine(line, lineCount)).toBe(0);
      }
    }
  });
});

describe("measureLayout", () => {
  it("puts each character on its line, relative to the text", () => {
    const layout = layoutOf([2, 3]);
    expect(layout.lines.slice(0, 5)).toEqual([0, 0, 1, 1, 1]);
    expect(layout.lefts.slice(0, 5)).toEqual([0, 10, 0, 10, 20]);
    expect(layout.lineTops).toEqual([0, 20]);
  });

  it("does not start a line for a taller fallback glyph", () => {
    const boxes = boxesOf([3]).map((box, index) =>
      index === 1 ? { ...box, top: box.top - 4, bottom: box.bottom + 4 } : box,
    );
    expect(measureLayout(boxes, ORIGIN_LEFT).lineTops).toEqual([0]);
  });

  it("rounds line tops to whole pixels", () => {
    const boxes: CharBox[] = [0, 35.2, 70.4].map((top) => ({
      left: 0,
      right: 10,
      top,
      bottom: top + 30,
    }));
    expect(measureLayout(boxes, 0).lineTops).toEqual([0, 35, 70]);
  });
});

describe("caretOffset", () => {
  it("sits at the left edge of the character at the index", () => {
    expect(caretOffset(layoutOf([2, 3]), 3)).toEqual({ x: 10, y: 20 });
  });

  it("follows a jump over an indentation run and back", () => {
    const layout = layoutOf([3, 6]);
    expect(caretOffset(layout, 7)).toEqual({ x: 40, y: 20 });
    expect(caretOffset(layout, 2)).toEqual({ x: 20, y: 0 });
  });

  it("sits after the last character at the end of the text, with no extra line", () => {
    const layout = layoutOf([2, 3]);
    expect(caretOffset(layout, 5)).toEqual({ x: 30, y: 20 });
    expect(layout.lineTops).toHaveLength(2);
  });

  it("stays at the origin for an empty text", () => {
    const layout = layoutOf([]);
    expect(caretOffset(layout, 0)).toEqual({ x: 0, y: 0 });
    expect(scrollOffset(layout, 0)).toBe(0);
  });
});

describe("scrollOffset", () => {
  const layout = layoutOf([2, 2, 2, 2, 2, 2]);

  it("is the top of the first visible line", () => {
    expect([0, 2, 4, 6].map((index) => scrollOffset(layout, index))).toEqual([
      0, 0, 20, 40,
    ]);
  });

  it("gives the same answer going back, for Backspace", () => {
    expect(scrollOffset(layout, 3)).toBe(0);
  });

  it("stays clamped at the end of the text", () => {
    expect(scrollOffset(layout, 12)).toBe(60);
  });
});
