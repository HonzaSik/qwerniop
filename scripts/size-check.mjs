import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const KB = 1024;

// Initial assets are those index.html references; lazy chunks are excluded on purpose.
const GROUPS = [
  ["Initial JS", /<(?:script|link)[^>]*(?:src|href)="([^"]+\.js)"/g, 50 * KB],
  ["Initial CSS", /<link[^>]*href="([^"]+\.css)"/g, 10 * KB],
];

// Returns failure messages; empty means every budget holds.
// shortcut: the `ai` chunk budget is not checked because PERFORMANCE.md names no file pattern for it; add once its chunk name exists.
export function checkSizes(dist) {
  const html = readFileSync(join(dist, "index.html"), "utf8");
  const failures = [];
  for (const [name, pattern, budget] of GROUPS) {
    let total = 0;
    for (const match of html.matchAll(pattern)) {
      total += gzipSync(readFileSync(join(dist, match[1]))).length;
    }
    if (total > budget) failures.push(`${name}: ${total} B gzip > ${budget} B`);
  }
  for (const entry of readdirSync(dist, { recursive: true })) {
    // Word lists are the only .txt assets, so any emitted .txt counts as one.
    if (entry.endsWith(".txt")) {
      const size = gzipSync(readFileSync(join(dist, entry))).length;
      if (size > 60 * KB)
        failures.push(`Word list ${entry}: ${size} B gzip > ${60 * KB} B`);
    }
    if (!entry.endsWith(".woff2")) continue;
    const size = readFileSync(join(dist, entry)).length;
    if (size > 60 * KB)
      failures.push(`Font ${entry}: ${size} B > ${60 * KB} B`);
  }
  return failures;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
  const failures = checkSizes(process.argv[2] ?? root);
  for (const f of failures) console.error(f);
  if (failures.length > 0) process.exit(1);
  console.log("size-check: all budgets hold");
}
