import { expect, test } from "vitest";

// Biome's noRestrictedImports cannot tell a relative path that stays in
// src/core/ from one that escapes it, so imports are scanned here instead.
const sources = import.meta.glob("/src/core/**/*", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const IMPORT = /\b(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

function outsideCore(file: string, source: string): string[] {
  const bad: string[] = [];
  for (const [, spec] of source.matchAll(IMPORT)) {
    if (spec === undefined) continue;
    const inside =
      spec.startsWith(".") &&
      new URL(spec, `file://${file}`).pathname.startsWith("/src/core/");
    if (!inside) bad.push(spec);
  }
  return bad;
}

test("src/core/ imports nothing outside itself", () => {
  const violations = Object.entries(sources).flatMap(([file, source]) =>
    outsideCore(file, source).map((spec) => `${file}: ${spec}`),
  );
  expect(violations).toEqual([]);
});

test("boundary scan flags escapes and allows inner imports", () => {
  const file = "/src/core/engine/a.ts";
  const src = [
    'import { a } from "./b";',
    'import { c } from "../layouts/c";',
    'import { d } from "../../ui/x";',
    'import { e } from "../../../outside";',
    'import { s } from "svelte";',
    'export * from "../../ui/y";',
    'const z = await import("svelte/store");',
  ].join("\n");
  expect(outsideCore(file, src)).toEqual([
    "../../ui/x",
    "../../../outside",
    "svelte",
    "../../ui/y",
    "svelte/store",
  ]);
});
