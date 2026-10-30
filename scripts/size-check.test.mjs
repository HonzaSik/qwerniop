import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { checkSizes } from "./size-check.mjs";

function fakeDist(jsBytes) {
  const dist = mkdtempSync(join(tmpdir(), "size-"));
  mkdirSync(join(dist, "assets"));
  writeFileSync(
    join(dist, "index.html"),
    '<script type="module" src="/assets/a.js"></script>',
  );
  writeFileSync(join(dist, "assets", "a.js"), randomBytes(jsBytes));
  return dist;
}

it("passes under budget and reports initial JS over budget", () => {
  expect(checkSizes(fakeDist(1000))).toEqual([]);
  expect(checkSizes(fakeDist(60 * 1024))[0]).toMatch(/^Initial JS/);
});
