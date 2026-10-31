// Registered after load and only in production builds, so nothing here is on the keystroke path.
export const worker = $state<{ waiting: ServiceWorker | null }>({
  waiting: null,
});

export function registerWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  addEventListener("load", async () => {
    const reg = await navigator.serviceWorker.register("sw.js");
    // Without a controller this is the first install, which is not an update.
    const offer = (sw: ServiceWorker | null) => {
      if (sw && navigator.serviceWorker.controller) worker.waiting = sw;
    };
    offer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const next = reg.installing;
      next?.addEventListener("statechange", () => {
        if (next.state === "installed") offer(next);
      });
    });
  });
}

export function applyUpdate(): void {
  // Reload only once the new worker controls the page, or the old shell would load again.
  navigator.serviceWorker.addEventListener("controllerchange", () =>
    location.reload(),
  );
  worker.waiting?.postMessage("skip-waiting");
}
