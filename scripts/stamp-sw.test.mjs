import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import { expect, it } from "vitest";
import { stampSw } from "./stamp-sw.mjs";

const SW = readFileSync(
  join(import.meta.dirname, "..", "public", "sw.js"),
  "utf8",
);

function fakeDist(css) {
  const dist = mkdtempSync(join(tmpdir(), "sw-"));
  mkdirSync(join(dist, "assets"));
  writeFileSync(join(dist, "sw.js"), SW);
  writeFileSync(join(dist, "index.html"), "<html>");
  writeFileSync(join(dist, "assets", "a.css"), css);
  writeFileSync(join(dist, "assets", "en-x.txt"), "word");
  return dist;
}

it("lists the shell without word lists or itself, and versions by content", () => {
  const a = stampSw(fakeDist("a"));
  expect(a.shell).toEqual(["./", "./assets/a.css", "./index.html"]);
  expect(stampSw(fakeDist("b")).version).not.toBe(a.version);
});

it("stamps sw.js so the stamped file still parses", () => {
  const dist = fakeDist("a");
  const { version } = stampSw(dist);
  const sw = readFileSync(join(dist, "sw.js"), "utf8");
  expect(sw).toContain(version);
  expect(() => new vm.Script(sw)).not.toThrow();
});

function fetchHandler() {
  let handler;
  const self = {
    location: { origin: "https://app.test" },
    addEventListener: (type, fn) => {
      if (type === "fetch") handler = fn;
    },
  };
  vm.runInNewContext(SW, {
    self,
    caches: { open: () => new Promise(() => {}) },
    URL,
  });
  return (request) => {
    let responded = false;
    handler({ request, respondWith: () => (responded = true) });
    return responded;
  };
}

it("handles only same-origin GET requests", () => {
  const handles = fetchHandler();
  expect(handles({ method: "GET", url: "https://app.test/assets/a.js" })).toBe(
    true,
  );
  expect(handles({ method: "POST", url: "https://app.test/v1/chat" })).toBe(
    false,
  );
  expect(
    handles({ method: "GET", url: "http://localhost:1234/v1/models" }),
  ).toBe(false);
});
