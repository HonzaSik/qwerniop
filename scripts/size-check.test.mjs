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

it("reports a word list over its gzip budget", () => {
  const dist = fakeDist(1000);
  writeFileSync(join(dist, "assets", "en-x.txt"), randomBytes(61 * 1024));
  expect(checkSizes(dist)[0]).toMatch(/^Word list/);
});

it("fails when the ai chunk is preloaded or statically imported", () => {
  const dist = fakeDist(1000);
  writeFileSync(join(dist, "assets", "ai-modes-x.js"), "export{}");
  expect(checkSizes(dist)).toEqual([]);
  writeFileSync(
    join(dist, "assets", "a.js"),
    'import{a}from"./b.js";import("./ai-modes-x.js")',
  );
  writeFileSync(join(dist, "assets", "b.js"), 'import"./ai-modes-x.js"');
  expect(checkSizes(dist)[0]).toMatch(/^ai chunk assets\/ai-modes-x\.js/);
  writeFileSync(
    join(dist, "index.html"),
    '<script type="module" src="/assets/a.js"></script><link rel="modulepreload" href="/assets/ai-modes-x.js">',
  );
  writeFileSync(join(dist, "assets", "a.js"), "export{}");
  expect(checkSizes(dist)[0]).toMatch(/^ai chunk/);
});
