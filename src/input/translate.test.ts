import { describe, expect, it } from "vitest";
import type { InputEvent as SessionInput } from "../core/engine/engine";
import { createTranslator } from "./translate";

function setup(enterTypesNewline = false) {
  const emitted: SessionInput[] = [];
  const codes: string[] = [];
  const pausedChanges: boolean[] = [];
  const composingChanges: boolean[] = [];
  const translator = createTranslator({
    enterTypesNewline,
    emit: (event) => emitted.push(event),
    onKeyDown: (code) => codes.push(code),
    onComposingChange: (composing) => composingChanges.push(composing),
    onPausedChange: (paused) => pausedChanges.push(paused),
  });
  return { translator, emitted, codes, pausedChanges, composingChanges };
}

function insert(data: string | null, timeStamp = 0, isComposing = false) {
  return { inputType: "insertText", data, isComposing, timeStamp };
}

function key(key: string, timeStamp = 0, isComposing = false) {
  return {
    key,
    code: `Code${key}`,
    isComposing,
    timeStamp,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
  };
}

describe("beforeInput", () => {
  it("turns insertText into a char and asks for preventDefault", () => {
    const { translator, emitted } = setup();
    expect(translator.beforeInput(insert("a", 100))).toBe(true);
    expect(emitted).toEqual([{ kind: "char", char: "a", at: 100 }]);
  });

  it("normalizes data to NFC", () => {
    const { translator, emitted } = setup();
    translator.beforeInput(insert("č", 100));
    expect(emitted).toEqual([{ kind: "char", char: "č", at: 100 }]);
  });

  it("emits one char per code point", () => {
    const { translator, emitted } = setup();
    translator.beforeInput(insert("´x\u{1F600}", 100));
    expect(emitted).toEqual([
      { kind: "char", char: "´", at: 100 },
      { kind: "char", char: "x", at: 100 },
      { kind: "char", char: "\u{1F600}", at: 100 },
    ]);
  });

  it("turns deleteContentBackward into backspace", () => {
    const { translator, emitted } = setup();
    const prevent = translator.beforeInput({
      inputType: "deleteContentBackward",
      data: null,
      isComposing: false,
      timeStamp: 100,
    });
    expect(prevent).toBe(true);
    expect(emitted).toEqual([{ kind: "backspace", at: 100 }]);
  });

  it("prevents other input types without emitting", () => {
    const { translator, emitted } = setup();
    for (const inputType of ["insertFromPaste", "insertLineBreak"]) {
      const prevent = translator.beforeInput({
        inputType,
        data: "x",
        isComposing: false,
        timeStamp: 100,
      });
      expect(prevent).toBe(true);
    }
    expect(translator.beforeInput(insert(null))).toBe(true);
    expect(emitted).toEqual([]);
  });
});

describe("composition", () => {
  it("emits only the final character, once, in NFC", () => {
    const { translator, emitted, composingChanges } = setup();
    translator.compositionStart();
    for (const data of ["ˇ", "č"]) {
      const prevent = translator.beforeInput({
        inputType: "insertCompositionText",
        data,
        isComposing: true,
        timeStamp: 100,
      });
      expect(prevent).toBe(false);
    }
    expect(emitted).toEqual([]);
    translator.compositionEnd({ data: "č", timeStamp: 150 });
    translator.flush();
    translator.flush();
    expect(emitted).toEqual([{ kind: "char", char: "č", at: 150 }]);
    expect(composingChanges).toEqual([true, false]);
  });

  it("leaves Backspace to the composition while composing", () => {
    const { translator, emitted } = setup();
    translator.compositionStart();
    const prevent = translator.beforeInput({
      inputType: "deleteContentBackward",
      data: null,
      isComposing: false,
      timeStamp: 100,
    });
    expect(prevent).toBe(false);
    expect(emitted).toEqual([]);
  });

  it("ignores beforeinput flagged as composing without compositionstart", () => {
    const { translator, emitted } = setup();
    expect(translator.beforeInput(insert("a", 100, true))).toBe(false);
    expect(emitted).toEqual([]);
  });

  it("emits nothing for a cancelled composition", () => {
    const { translator, emitted } = setup();
    translator.compositionStart();
    translator.compositionEnd({ data: "", timeStamp: 100 });
    expect(emitted).toEqual([]);
  });

  it("types a finished composition before the next key, however early that comes", () => {
    const { translator, emitted } = setup(true);
    for (const next of [
      () => translator.beforeInput(insert("a", 200)),
      () => translator.keyDown(key("Enter", 200)),
      () => translator.compositionStart(),
    ]) {
      emitted.length = 0;
      translator.compositionStart();
      translator.compositionEnd({ data: "č", timeStamp: 100 });
      next();
      expect(emitted[0]).toEqual({ kind: "char", char: "č", at: 100 });
      translator.compositionEnd({ data: "", timeStamp: 200 });
    }
  });

  it("takes plain input again after composition ends", () => {
    const { translator, emitted } = setup();
    translator.compositionStart();
    translator.compositionEnd({ data: "č", timeStamp: 100 });
    translator.beforeInput(insert("a", 200));
    expect(emitted).toEqual([
      { kind: "char", char: "č", at: 100 },
      { kind: "char", char: "a", at: 200 },
    ]);
  });
});

describe("keyDown", () => {
  it("reports the physical key and never reads a character from it", () => {
    const { translator, emitted, codes } = setup();
    expect(translator.keyDown(key("a"))).toBe(false);
    expect(translator.keyDown(key("Dead"))).toBe(false);
    expect(codes).toEqual(["Codea", "CodeDead"]);
    expect(emitted).toEqual([]);
  });

  it("types a newline on Enter when the passage holds one", () => {
    const { translator, emitted } = setup(true);
    expect(translator.keyDown(key("Enter", 100))).toBe(true);
    expect(emitted).toEqual([{ kind: "char", char: "\n", at: 100 }]);
  });

  it("swallows Enter without emitting when the passage holds no newline", () => {
    const { translator, emitted } = setup(false);
    expect(translator.keyDown(key("Enter", 100))).toBe(true);
    expect(emitted).toEqual([]);
  });

  it("leaves Enter to the composition while composing", () => {
    const { translator, emitted } = setup(true);
    expect(translator.keyDown(key("Enter", 100, true))).toBe(false);
    expect(emitted).toEqual([]);
  });
});

describe("pausing", () => {
  it("swallows the resuming key and keeps paused input out", () => {
    const { translator, emitted, pausedChanges } = setup(true);
    translator.pause(100);
    expect(translator.beforeInput(insert("a", 150))).toBe(true);
    expect(emitted).toEqual([]);

    expect(translator.keyDown(key("Enter", 200))).toBe(true);
    expect(emitted).toEqual([]);
    expect(pausedChanges).toEqual([true, false]);
  });

  it("does not resume on a modifier-only key", () => {
    const { translator, pausedChanges } = setup();
    translator.pause(100);
    for (const name of ["Alt", "Shift", "Control", "Meta", "AltGraph"]) {
      expect(translator.keyDown(key(name, 200))).toBe(false);
    }
    expect(pausedChanges).toEqual([true]);
  });

  it("stays paused on Esc, which is what paused it, and on Tab, which moves focus", () => {
    const { translator, pausedChanges } = setup();
    translator.pause(100);
    for (const name of ["Escape", "Tab"]) {
      expect(translator.keyDown(key(name, 200))).toBe(false);
    }
    expect(pausedChanges).toEqual([true]);
  });

  it("leaves browser shortcuts and function keys alone", () => {
    const { translator, pausedChanges } = setup();
    translator.pause(100);
    for (const shortcut of [
      { ...key("r"), ctrlKey: true },
      { ...key("r"), metaKey: true },
      { ...key("ArrowLeft"), altKey: true },
      key("F5"),
      key("F12"),
    ]) {
      expect(translator.keyDown(shortcut)).toBe(false);
    }
    expect(pausedChanges).toEqual([true]);
  });

  it("resumes on a character typed with AltGr, which Windows reports as Ctrl+Alt", () => {
    const { translator, pausedChanges } = setup();
    translator.pause(100);
    const altGr = { ...key("ł"), ctrlKey: true, altKey: true };
    expect(translator.keyDown(altGr)).toBe(true);
    expect(pausedChanges).toEqual([true, false]);
  });

  it("drops the text of a composition the blur itself ended", () => {
    const { translator, emitted, composingChanges } = setup();
    translator.compositionStart();
    translator.compositionEnd({ data: "ˇ", timeStamp: 100 });
    translator.pause(100);
    translator.flush();
    translator.resume(200);
    expect(emitted).toEqual([]);
    expect(composingChanges).toEqual([true, false]);
  });

  it("recovers from a blur during a composition that never ends", () => {
    const { translator, emitted, composingChanges } = setup();
    translator.compositionStart();
    translator.pause(100);
    translator.keyDown(key("f", 200));
    translator.beforeInput(insert("a", 300));
    expect(emitted).toEqual([{ kind: "char", char: "a", at: 200 }]);
    expect(composingChanges).toEqual([true, false]);
  });

  it("recovers on resume from a composition started while paused", () => {
    const { translator, emitted, composingChanges } = setup();
    translator.pause(100);
    translator.compositionStart();
    translator.resume(200);
    translator.beforeInput(insert("a", 300));
    expect(emitted).toEqual([{ kind: "char", char: "a", at: 200 }]);
    expect(composingChanges).toEqual([true, false]);
  });

  it("emits nothing when an abandoned composition ends after the resume", () => {
    const { translator, emitted, composingChanges } = setup();
    translator.compositionStart();
    translator.pause(100);
    translator.resume(200);
    translator.compositionEnd({ data: "ˇ", timeStamp: 250 });
    expect(emitted).toEqual([]);
    expect(composingChanges).toEqual([true, false]);
  });

  it("removes paused time from at, ending at the resuming event", () => {
    const { translator, emitted } = setup();
    translator.beforeInput(insert("a", 9_800));
    translator.pause(10_000);
    translator.keyDown(key("f", 70_000));
    translator.beforeInput(insert("f", 70_500));
    expect(emitted).toEqual([
      { kind: "char", char: "a", at: 9_800 },
      { kind: "char", char: "f", at: 10_500 },
    ]);
  });

  it("adds up pauses and shifts every kind of event", () => {
    const { translator, emitted } = setup(true);
    translator.pause(100);
    translator.resume(300);
    translator.pause(400);
    translator.keyDown(key("f", 500));
    translator.keyDown(key("Enter", 1_000));
    translator.beforeInput({
      inputType: "deleteContentBackward",
      data: null,
      isComposing: false,
      timeStamp: 1_100,
    });
    translator.compositionStart();
    translator.compositionEnd({ data: "a", timeStamp: 1_200 });
    translator.flush();
    expect(emitted).toEqual([
      { kind: "char", char: "\n", at: 700 },
      { kind: "backspace", at: 800 },
      { kind: "char", char: "a", at: 900 },
    ]);
  });

  it("counts a repeated blur once and a resume while running as nothing", () => {
    const { translator, emitted, pausedChanges } = setup();
    translator.resume(50);
    translator.pause(100);
    translator.pause(150);
    translator.resume(200);
    translator.beforeInput(insert("a", 300));
    expect(pausedChanges).toEqual([true, false]);
    expect(emitted).toEqual([{ kind: "char", char: "a", at: 200 }]);
  });

  it("emits nothing when a composition ends while paused", () => {
    const { translator, emitted } = setup();
    translator.compositionStart();
    translator.pause(100);
    translator.compositionEnd({ data: "ˇ", timeStamp: 150 });
    expect(emitted).toEqual([]);
  });
});
