import type { Layout } from "../layouts/layout";

// LAYOUTS.md, "Lesson order". Each stage adds its letters; Space is typable from the start.
const ORDER: Partial<Record<Layout["id"], readonly string[]>> = {
  "en-us": [
    "fj",
    "dk",
    "sl",
    "a",
    "ei",
    "ru",
    "to",
    "nh",
    "gc",
    "mp",
    "wy",
    "bv",
    "xq",
    "z",
  ],
  "cs-qwertz": [
    "fj",
    "dk",
    "sl",
    "a",
    "ei",
    "on",
    "tr",
    "vu",
    "pm",
    "hc",
    "zy",
    "bg",
    "xwq",
    "áíé",
    "ěšč",
    "řžý",
    "úů",
  ],
};

// Stage 1 is the first pair; a stage past the end unlocks everything.
export function unlockedLetters(
  id: Layout["id"],
  stage: number,
): string | undefined {
  return ORDER[id]?.slice(0, Math.max(stage, 0)).join("");
}

export function stageCount(id: Layout["id"]): number {
  return ORDER[id]?.length ?? 0;
}
