import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const KB = 1024;

// Initial assets are those index.html references; lazy chunks are excluded on purpose.
const GROUPS = [
  ["Initial JS", /<(?:script|link)[^>]*(?:src|href)="([^"]+\.js)"/g, 50 * KB],
  ["Initial CSS", /<link[^>]*href="([^"]+\.css)"/g, 10 * KB],
];

// vite.config names every chunk holding src/ai code `ai-*.js`; none may load with the page.
// shortcut: static imports are found by regex on minified output, so a bundler change in its import syntax needs this updated.
function initialAiChunks(dist, html) {
  const seen = new Set();
  const queue = [...html.matchAll(/(?:src|href)="\/?([^"]+\.js)"/g)].map(
    (m) => m[1],
  );
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const code = readFileSync(join(dist, file), "utf8");
    for (const m of code.matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g)) {
      queue.push(join(dirname(file), m[1]));
    }
  }
  return [...seen].filter((f) => basename(f).startsWith("ai-"));
}

// Returns failure messages; empty means every budget holds.
export function checkSizes(dist) {
  const html = readFileSync(join(dist, "index.html"), "utf8");
  const failures = initialAiChunks(dist, html).map(
    (f) => `ai chunk ${f} loads with the page`,
  );
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
