import { describe, expect, test } from "vitest";
import { csQwertz } from "../layouts/cs-qwertz";
import { enUs } from "../layouts/en-us";
import { CUSTOM_TEXT_MAX, prepareCustomText } from "./custom";

describe("prepareCustomText", () => {
  test("keeps typable text as it is", () => {
    expect(prepareCustomText(enUs, "Hello, world!")).toEqual({
      text: "Hello, world!",
      dropped: 0,
    });
  });

  test("turns typographic marks into plain ones without counting them", () => {
    expect(prepareCustomText(enUs, "“it’s” – fine…")).toEqual({
      text: '"it\'s" - fine...',
      dropped: 0,
    });
  });

  test("uses the plain letter only on a layout without the accented one", () => {
    expect(prepareCustomText(enUs, "café").text).toBe("cafe");
    expect(prepareCustomText(csQwertz, "čaj").text).toBe("čaj");
  });

  test("drops and counts what has no typable form, leaving no double spaces", () => {
    expect(prepareCustomText(enUs, "a 你 b")).toEqual({
      text: "a b",
      dropped: 1,
    });
  });

  test("collapses every run of whitespace, line breaks included", () => {
    expect(prepareCustomText(enUs, "  one\r\n\r\ntwo\t three \n").text).toBe(
      "one two three",
    );
  });

  test("non-breaking hyphens stay hyphens", () => {
    expect(prepareCustomText(enUs, "well\u2011known \u2010 yes")).toEqual({
      text: "well-known - yes",
      dropped: 0,
    });
  });

  test("the cap never leaves a trailing space to type", () => {
    const raw = `${"…".repeat(1666)}a ${"b".repeat(9)}`;
    expect(prepareCustomText(enUs, raw).text.endsWith(" ")).toBe(false);
  });

  test("nothing typable leaves empty text", () => {
    expect(prepareCustomText(enUs, "  你好 ")).toEqual({
      text: "",
      dropped: 2,
    });
    expect(prepareCustomText(enUs, "").text).toBe("");
  });

  test("stops at the length cap, also when clean-up makes the text longer", () => {
    expect(
      prepareCustomText(enUs, "a".repeat(CUSTOM_TEXT_MAX + 10)).text,
    ).toHaveLength(CUSTOM_TEXT_MAX);
    expect(
      prepareCustomText(enUs, "…".repeat(CUSTOM_TEXT_MAX)).text,
    ).toHaveLength(CUSTOM_TEXT_MAX);
  });
});
