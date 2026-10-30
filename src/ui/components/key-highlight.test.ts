import { describe, expect, it } from "vitest";
import { enUs } from "../../core/layouts/en-us";
import type { Layout } from "../../core/layouts/layout";
import { createHighlighter, type KeyElement } from "./key-highlight";

function setup(layout: Layout = enUs) {
  const classes = new Map<string, Set<string>>();
  const keys = new Map<string, KeyElement>();
  for (const k of layout.keys) {
    const set = new Set<string>();
    classes.set(k.code, set);
    keys.set(k.code, {
      classList: {
        add: (n) => void set.add(n),
        remove: (n) => void set.delete(n),
      },
    });
  }
  const has = (name: string) =>
    [...classes]
      .filter(([, s]) => s.has(name))
      .map(([c]) => c)
      .sort();
  return { h: createHighlighter(layout, keys), has };
}

const dead: Layout = {
  id: "cs-qwertz",
  name: "fixture",
  locale: "cs-CZ",
  keys: [
    { code: "KeyA", row: 2, finger: "L5", base: "a", shift: "A" },
    { code: "KeyE", row: 1, finger: "L3", base: "e" },
    {
      code: "Equal",
      row: 0,
      finger: "R5",
      base: "",
      deadBase: "\u00b4",
      deadShift: "\u02c7",
    },
    { code: "ShiftLeft", row: 3, finger: "L5", base: "" },
    { code: "ShiftRight", row: 3, finger: "R5", base: "" },
  ],
  compose: { "\u00b4": { a: "\u00e1" }, "\u02c7": { e: "\u011b" } },
};

describe("createHighlighter", () => {
  it("steps through a dead-key sequence one stroke at a time", () => {
    const { h, has } = setup(dead);
    h.next("\u00e1");
    expect(has("next")).toEqual(["Equal"]);
    h.keyDown("Equal");
    expect(has("next")).toEqual(["KeyA"]);
    h.next("x");
    expect(has("next")).toEqual([]);
  });
  it("lights the dead key's Shift in the first step only", () => {
    const { h, has } = setup(dead);
    h.next("\u011b");
    expect(has("next")).toEqual(["Equal", "ShiftLeft"]);
    h.keyDown("ShiftLeft");
    expect(has("next")).toEqual(["Equal", "ShiftLeft"]);
    h.keyDown("Equal");
    expect(has("next")).toEqual(["KeyE"]);
  });
  it("lights a plain key", () => {
    const { h, has } = setup();
    h.next("a");
    expect(has("next")).toEqual(["KeyA"]);
  });
  it("lights the opposite Shift for a shifted character", () => {
    const { h, has } = setup();
    h.next("A");
    expect(has("next")).toEqual(["KeyA", "ShiftRight"]);
    h.next("J");
    expect(has("next")).toEqual(["KeyJ", "ShiftLeft"]);
  });
  it("moves the highlight and clears it at the end", () => {
    const { h, has } = setup();
    h.next("a");
    h.next("b");
    expect(has("next")).toEqual(["KeyB"]);
    h.next(undefined);
    expect(has("next")).toEqual([]);
  });
  it("lights nothing for a character the layout cannot type", () => {
    const { h, has } = setup();
    h.next("\u{1F600}");
    expect(has("next")).toEqual([]);
  });
  it("marks pressed and wrong keys until release", () => {
    const { h, has } = setup();
    h.keyDown("KeyQ");
    h.wrong("KeyQ");
    expect(has("pressed")).toEqual(["KeyQ"]);
    expect(has("wrong")).toEqual(["KeyQ"]);
    h.release("KeyQ");
    expect(has("pressed")).toEqual([]);
    expect(has("wrong")).toEqual([]);
  });
  it("releases one key without touching another, and all without a code", () => {
    const { h, has } = setup();
    h.keyDown("KeyQ");
    h.keyDown("KeyW");
    h.release("KeyQ");
    expect(has("pressed")).toEqual(["KeyW"]);
    h.release();
    expect(has("pressed")).toEqual([]);
  });
  it("ignores codes without a key element", () => {
    const { h, has } = setup();
    h.keyDown("Nope");
    h.wrong("Nope");
    expect(has("pressed")).toEqual([]);
  });
});
