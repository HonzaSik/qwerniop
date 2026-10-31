import { expect, test } from "vitest";
import { LAYOUTS, layoutById } from "./registry";

test("every layout is found by its id", () => {
  for (const l of LAYOUTS) expect(layoutById(l.id)).toBe(l);
});
