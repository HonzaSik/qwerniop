import type { Layout } from "../layouts/layout";
import { producible, typable } from "./typable";

export const CUSTOM_TEXT_MAX = 5000;

export interface CustomText {
  text: string;
  /** Characters left out because the layout has no way to type them. */
  dropped: number;
}

/** Pasted text in a form the layout can type. Whitespace collapses: line breaks from a web page are not meant as Enter presses. */
export function prepareCustomText(layout: Layout, raw: string): CustomText {
  let text = "";
  let dropped = 0;
  for (const ch of typable(raw).replace(/\s+/gu, " ")) {
    const typed = producible(layout, ch);
    if (typed === undefined) dropped++;
    else text += typed;
  }
  return {
    text: text.replace(/ +/g, " ").trim().slice(0, CUSTOM_TEXT_MAX).trimEnd(),
    dropped,
  };
}
