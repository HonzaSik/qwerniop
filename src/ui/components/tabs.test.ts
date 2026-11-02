import { expect, test } from "vitest";
import { nextTab } from "./tabs";

test("arrows move one tab and wrap at the ends", () => {
  expect(nextTab("ArrowRight", 0, 4)).toBe(1);
  expect(nextTab("ArrowRight", 3, 4)).toBe(0);
  expect(nextTab("ArrowLeft", 1, 4)).toBe(0);
  expect(nextTab("ArrowLeft", 0, 4)).toBe(3);
});

test("Home and End go to the first and last tab", () => {
  expect(nextTab("Home", 2, 4)).toBe(0);
  expect(nextTab("End", 2, 4)).toBe(3);
});

test("other keys move nothing", () => {
  expect(nextTab("Enter", 2, 4)).toBeUndefined();
});
