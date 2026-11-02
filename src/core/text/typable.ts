import type { Layout } from "../layouts/layout";
import { strokesFor } from "../layouts/strokes";

// Includes U+00A0 and U+202F (no-break spaces), which the formatter writes literally.
const TYPOGRAPHIC: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "‚": "'",
  "“": '"',
  "”": '"',
  "„": '"',
  "‐": "-",
  "‑": "-",
  "–": "-",
  "—": "-",
  "…": "...",
  " ": " ",
  " ": " ",
};

// Letters that do not decompose under NFD.
const TRANSLITERATE: Record<string, string> = {
  ß: "ss",
  æ: "ae",
  Æ: "AE",
  œ: "oe",
  Œ: "OE",
  ø: "o",
  Ø: "O",
  đ: "d",
  Đ: "D",
  ł: "l",
  Ł: "L",
};

/** Plain forms of typographic marks, which no keyboard layout has keys for. */
export function typable(text: string): string {
  return text.normalize("NFC").replace(/./gsu, (c) => TYPOGRAPHIC[c] ?? c);
}

/** The typable form of `ch`, or undefined when the layout cannot produce it. */
export function producible(layout: Layout, ch: string): string | undefined {
  if (strokesFor(layout, ch)) return ch;
  const base = TRANSLITERATE[ch] ?? ch.normalize("NFD").replace(/\p{M}/gu, "");
  if (base === ch) return undefined;
  return [...base].every((c) => strokesFor(layout, c)) ? base : undefined;
}
