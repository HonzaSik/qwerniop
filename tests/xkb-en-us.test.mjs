import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { enUs } from "../src/core/layouts/en-us.ts";

const US = "/usr/share/X11/xkb/symbols/us";

const KEYSYM = {
  grave: "`",
  asciitilde: "~",
  exclam: "!",
  at: "@",
  numbersign: "#",
  dollar: "$",
  percent: "%",
  asciicircum: "^",
  ampersand: "&",
  asterisk: "*",
  parenleft: "(",
  parenright: ")",
  minus: "-",
  underscore: "_",
  equal: "=",
  plus: "+",
  bracketleft: "[",
  braceleft: "{",
  bracketright: "]",
  braceright: "}",
  backslash: "\\",
  bar: "|",
  semicolon: ";",
  colon: ":",
  apostrophe: "'",
  quotedbl: '"',
  comma: ",",
  less: "<",
  period: ".",
  greater: ">",
  slash: "/",
  question: "?",
};

const XKB_CODE = {
  TLDE: "Backquote",
  AE11: "Minus",
  AE12: "Equal",
  AD11: "BracketLeft",
  AD12: "BracketRight",
  BKSL: "Backslash",
  AC10: "Semicolon",
  AC11: "Quote",
  AB08: "Comma",
  AB09: "Period",
  AB10: "Slash",
};
for (let i = 1; i <= 10; i++) {
  XKB_CODE[`AE${String(i).padStart(2, "0")}`] = `Digit${i % 10}`;
}
for (const [prefix, letters] of [
  ["AD", "qwertyuiop"],
  ["AC", "asdfghjkl"],
  ["AB", "zxcvbnm"],
]) {
  [...letters].forEach((c, i) => {
    XKB_CODE[`${prefix}${String(i + 1).padStart(2, "0")}`] =
      `Key${c.toUpperCase()}`;
  });
}

const sym = (name) => KEYSYM[name] ?? name;

describe.skipIf(!existsSync(US))("en-us against XKB us(basic)", () => {
  const text = readFileSync(US, "utf8");
  const start = text.indexOf('xkb_symbols "basic" {');
  const block = text.slice(start, text.indexOf("\n};", start));
  const parsed = [
    ...block.matchAll(
      /key <(\w+)>\s*\{\s*\[\s*([^,\s]+)\s*,\s*([^\]\s]+)\s*\]/g,
    ),
  ];

  it("parses 47 keys", () => {
    expect(parsed).toHaveLength(47);
  });

  it("matches every key", () => {
    for (const [, xkb, base, shift] of parsed) {
      const code = XKB_CODE[xkb];
      const def = enUs.keys.find((k) => k.code === code);
      expect(def, `${xkb} -> ${code}`).toBeDefined();
      expect({ base: def?.base, shift: def?.shift }, code).toEqual({
        base: sym(base),
        shift: sym(shift),
      });
    }
  });

  it("has no extra character keys", () => {
    const layoutCodes = enUs.keys
      .filter((k) => [...k.base].length === 1 && k.base.trim() !== "")
      .map((k) => k.code)
      .sort();
    expect(layoutCodes).toEqual(parsed.map(([, x]) => XKB_CODE[x]).sort());
  });
});
