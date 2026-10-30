// Temporary: proves Vitest runs. Delete when the first core/ test lands in milestone 2.
import { expect, test } from "vitest";

test("vitest runs", () => {
  expect(1 + 1).toBe(2);
});
