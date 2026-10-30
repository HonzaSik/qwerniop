import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// A word is dropped as a proper noun when its lowercase form is below this share of all its case variants.
const MIN_LOWER_SHARE = 0.7;

// Raw lines are "word" or Leipzig "id<TAB>word<TAB>count". Plain lists get descending
// synthetic counts so their order survives the frequency sort.
// Returns the normalized words, most frequent first.
export function normalize(
  lines,
  { canType, blocked = new Set(), singles = [], limit = 10000 },
) {
  const total = new Map();
  const lower = new Map();
  lines.forEach((line, i) => {
    const f = line.split("\t");
    const raw = (f.length >= 3 ? f[1] : f[0])?.trim().normalize("NFC");
    if (!raw) return;
    const count = f.length >= 3 ? Number(f[2]) : lines.length - i;
    const word = raw.toLowerCase().normalize("NFC");
    total.set(word, (total.get(word) ?? 0) + count);
    if (raw === word) lower.set(word, (lower.get(word) ?? 0) + count);
  });
  return [...total]
    .filter(
      ([w, n]) =>
        /^\p{L}+$/u.test(w) &&
        [...w].every(canType) &&
        (lower.get(w) ?? 0) >= n * MIN_LOWER_SHARE &&
        (w.length > 1 || singles.includes(w)) &&
        !blocked.has(w),
    )
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit)
    .map(([w]) => w);
}

function readLines(path) {
  return readFileSync(path, "utf8").split("\n");
}

async function main(args) {
  const [rawPath, layoutId] = args;
  const opt = (name) => {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args[i + 1];
  };
  if (!rawPath || !layoutId || rawPath.startsWith("--")) {
    console.error(
      "usage: node scripts/normalize-words.mjs <raw> <layout-id> [--profanity file] [--singles a,i] [--limit n] > out.txt",
    );
    process.exit(2);
  }
  // Vite resolves the extensionless imports inside src/core that plain Node cannot.
  const { createServer } = await import("vite");
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const server = await createServer({
    root,
    configFile: false,
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  try {
    const { strokesFor } = await server.ssrLoadModule(
      "/src/core/layouts/strokes.ts",
    );
    const mod = await server.ssrLoadModule(`/src/core/layouts/${layoutId}.ts`);
    const layout = Object.values(mod).find((v) => v?.id === layoutId);
    if (!layout) throw new Error(`no layout "${layoutId}"`);
    const profanity = opt("--profanity");
    const words = normalize(readLines(rawPath), {
      canType: (c) => strokesFor(layout, c) !== undefined,
      blocked: new Set(
        profanity ? readLines(profanity).map((w) => w.trim()) : [],
      ),
      singles: (opt("--singles") ?? "").split(",").filter(Boolean),
      limit: Number(opt("--limit") ?? 10000),
    });
    process.stdout.write(`${words.join("\n")}\n`);
  } finally {
    await server.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
