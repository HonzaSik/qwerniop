import { describe, expect, it } from "vitest";
import { apply, createSession, type ErrorMode } from "../../core/engine/engine";
import { charText, paintChars } from "./char-status";

const UNTOUCHED = "untouched";

function setup(text: string, errorMode: ErrorMode) {
  const session = createSession({ text, errorMode });
  const spans = session.chars.map(() => ({ className: UNTOUCHED }));
  return {
    classes: () => spans.map((span) => span.className),
    type(char: string) {
      const event = { kind: "char", char, at: 0 } as const;
      paintChars(spans, session.chars, apply(session, event));
    },
    backspace() {
      const event = { kind: "backspace", at: 0 } as const;
      paintChars(spans, session.chars, apply(session, event));
    },
    paintAll() {
      paintChars(spans, session.chars, session.chars.keys());
    },
  };
}

describe("paintChars", () => {
  it("touches only the spans an event changed", () => {
    const view = setup("abc", "stop");
    view.type("a");
    expect(view.classes()).toEqual(["typed", UNTOUCHED, UNTOUCHED]);
  });

  it("marks a wrong character, then shows it corrected as typed in stop mode", () => {
    const view = setup("ab", "stop");
    view.type("x");
    expect(view.classes()).toEqual(["wrong", UNTOUCHED]);
    view.type("a");
    expect(view.classes()).toEqual(["typed", UNTOUCHED]);
  });

  it("follows Backspace, which replaces the character at a position", () => {
    const view = setup("ab", "continue");
    view.type("x");
    expect(view.classes()).toEqual(["wrong", UNTOUCHED]);
    view.backspace();
    expect(view.classes()).toEqual(["", UNTOUCHED]);
    view.type("a");
    expect(view.classes()).toEqual(["typed", UNTOUCHED]);
  });

  it("marks a wrong newline and leaves skipped indentation unmarked", () => {
    const view = setup("a\n  b", "continue");
    view.type("a");
    view.type("x");
    expect(view.classes()).toEqual(["typed", "wrong", "", "", UNTOUCHED]);
    view.backspace();
    expect(view.classes()).toEqual(["typed", "", "", "", UNTOUCHED]);
  });

  it("paints every character of a session shown part way through", () => {
    const view = setup("abc", "continue");
    view.type("a");
    view.type("x");
    view.paintAll();
    expect(view.classes()).toEqual(["typed", "wrong", ""]);
  });

  it("ignores an index with no span", () => {
    const session = createSession({ text: "a", errorMode: "stop" });
    expect(() => paintChars([], session.chars, [0, 5])).not.toThrow();
  });
});

describe("charText", () => {
  it("keeps characters as they are, including spaces and tabs", () => {
    for (const char of ["a", "č", " ", "\t"]) {
      expect(charText(char)).toBe(char);
    }
  });

  it("gives a newline a space to paint an error on", () => {
    expect(charText("\n")).toBe(" \n");
  });
});
