import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { csQwertz } from "../src/core/layouts/cs-qwertz.ts";

const CZ = "/usr/share/X11/xkb/symbols/cz";

const KEYSYM = {
  semicolon: ";",
  plus: "+",
  equal: "=",
  percent: "%",
  slash: "/",
  parenleft: "(",
  parenright: ")",
  quotedbl: '"',
  exclam: "!",
  apostrophe: "'",
  backslash: "\\",
  bar: "|",
  comma: ",",
  question: "?",
  period: ".",
  colon: ":",
  minus: "-",
  underscore: "_",
  space: " ",
  ecaron: "ě",
  scaron: "š",
  ccaron: "č",
  rcaron: "ř",
  zcaron: "ž",
  yacute: "ý",
  aacute: "á",
  iacute: "í",
  eacute: "é",
  uacute: "ú",
  uring: "ů",
  section: "§",
};

const DEAD = {
  dead_acute: "´",
  dead_caron: "ˇ",
  dead_diaeresis: "¨",
  dead_abovering: "˚",
};

const XKB_CODE = {
  TLDE: "Backquote",
  AE11: "Minus",
  AE12: "Equal",
  AD11: "BracketLeft",
  AD12: "BracketRight",
  AC10: "Semicolon",
  AC11: "Quote",
  BKSL: "Backslash",
  LSGT: "IntlBackslash",
  AB08: "Comma",
  AB09: "Period",
  AB10: "Slash",
  SPCE: "Space",
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

// Unknown keysyms must fail the comparison, not pass through as text.
const sym = (name) =>
  KEYSYM[name] ?? ([...name].length === 1 ? name : undefined);

describe.skipIf(!existsSync(CZ))("cs-qwertz against XKB cz(basic)", () => {
  const text = readFileSync(CZ, "utf8");
  const start = text.indexOf('xkb_symbols "basic" {');
  const block = text.slice(start, text.indexOf("\n};", start));
  const parsed = [
    ...block.matchAll(/key <(\w+)>\s*\{\s*\[\s*([^,\s]+)\s*,\s*([^,\]\s]+)/g),
  ];

  it("parses 49 keys", () => {
    expect(parsed).toHaveLength(49);
  });

  it("matches every key", () => {
    for (const [, xkb, l1, l2] of parsed) {
      const code = XKB_CODE[xkb];
      const def = csQwertz.keys.find((k) => k.code === code);
      expect(def, `${xkb} -> ${code}`).toBeDefined();
      expect(
        {
          base: def?.base,
          shift: def?.shift,
          deadBase: def?.deadBase,
          deadShift: def?.deadShift,
        },
        code,
      ).toEqual({
        base: DEAD[l1] ? "" : sym(l1),
        // Space is the one key whose Shift level repeats the base on purpose.
        shift: DEAD[l2] || xkb === "SPCE" ? undefined : sym(l2),
        deadBase: DEAD[l1],
        deadShift: DEAD[l2],
      });
    }
  });

  it("has no extra character keys", () => {
    const layoutCodes = csQwertz.keys
      .filter(
        (k) =>
          (k.base !== "" || k.deadBase) && k.base !== "\t" && k.base !== "\n",
      )
      .map((k) => k.code)
      .sort();
    expect(layoutCodes).toEqual(parsed.map(([, x]) => XKB_CODE[x]).sort());
  });
});
