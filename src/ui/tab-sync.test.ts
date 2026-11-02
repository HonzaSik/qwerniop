import { expect, test } from "vitest";
import { createTabSync } from "./tab-sync";

const delivered = () => new Promise((resolve) => setTimeout(resolve, 20));

test("a tab reloads when it regains focus after another tab saved", async () => {
  let reloads = 0;
  const other = createTabSync(() => reloads++);
  const saving = createTabSync(() => {
    throw new Error("a tab must not reload for its own save");
  });
  saving.tell();
  await delivered();
  expect(reloads).toBe(0);
  other.regained();
  expect(reloads).toBe(1);
  saving.regained();
  other.close();
  saving.close();
});

test("a tab with nothing newer elsewhere does not reload", () => {
  let reloads = 0;
  const tab = createTabSync(() => reloads++);
  tab.regained();
  expect(reloads).toBe(0);
  tab.close();
});
