// Stamped by scripts/stamp-sw.mjs after the build; the stamp changes this file's bytes, which is what makes browsers see an update.
const BUILD = { shell: [], version: "dev" };
const CACHE = `qwerniop-${BUILD.version}`;

self.addEventListener("install", (event) => {
  // No skipWaiting here: the page offers "Update available" instead of swapping under a running session.
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(BUILD.shell)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Model-server calls are POST or cross-origin, so they never reach the cache.
  // shortcut: a same-origin GET to a model proxy would be cached, upgrade if one is ever supported.
  if (
    request.method !== "GET" ||
    new URL(request.url).origin !== self.location.origin
  )
    return;
  // Hashed asset names make cache-first safe; word lists and fonts land here on first load.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(request, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(request);
      if (res.ok) cache.put(request, res.clone());
      return res;
    }),
  );
});
