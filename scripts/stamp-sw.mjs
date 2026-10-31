import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PLACEHOLDER = 'const BUILD = { shell: [], version: "dev" };';

// Word lists are left out: they are cached when first loaded, so an English user never downloads the Czech list.
const isShell = (f) => f !== "sw.js" && !f.endsWith(".txt");

// Lists the built app shell in dist/sw.js; the version is a hash of the shell contents.
export function stampSw(dist) {
  const files = readdirSync(dist, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) =>
      relative(dist, join(e.parentPath, e.name)).replaceAll("\\", "/"),
    )
    .filter(isShell)
    .sort();
  const hash = createHash("sha256");
  for (const f of files) hash.update(f).update(readFileSync(join(dist, f)));
  const shell = ["./", ...files.map((f) => `./${f}`)];
  const build = { shell, version: hash.digest("hex").slice(0, 12) };
  const sw = readFileSync(join(dist, "sw.js"), "utf8");
  if (!sw.includes(PLACEHOLDER))
    throw new Error("sw.js has no BUILD placeholder");
  writeFileSync(
    join(dist, "sw.js"),
    sw.replace(PLACEHOLDER, () => `const BUILD = ${JSON.stringify(build)};`),
  );
  return build;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
  const { shell, version } = stampSw(process.argv[2] ?? root);
  console.log(`stamp-sw: ${shell.length} shell entries, version ${version}`);
}
