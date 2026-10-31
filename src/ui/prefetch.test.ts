import { describe, expect, test } from "vitest";
import { createPrefetch } from "./prefetch";

const deferred = () => {
  let resolve: (v: string | undefined) => void = () => {};
  let reject: (e: unknown) => void = () => {};
  const promise = new Promise<string | undefined>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("prefetch", () => {
  test("ready in time: taken once", async () => {
    const p = createPrefetch<string>();
    p.request("a", async () => "text");
    await tick();
    expect(p.take("a")).toBe("text");
    expect(p.take("a")).toBe(undefined);
  });

  test("not ready: undefined at once, and the late result is not served to a later take of another key", async () => {
    const p = createPrefetch<string>();
    const d = deferred();
    p.request("a", () => d.promise);
    expect(p.take("a")).toBe(undefined);
    d.resolve("late");
    await tick();
    expect(p.take("b")).toBe(undefined);
  });

  test("stale key: result is dropped and the old request is aborted", async () => {
    const p = createPrefetch<string>();
    const d = deferred();
    let signal: AbortSignal | undefined;
    p.request("a", (s) => {
      signal = s;
      return d.promise;
    });
    p.request("b", async () => "b-text");
    expect(signal?.aborted).toBe(true);
    d.resolve("a-text");
    await tick();
    expect(p.take("a")).toBe(undefined);
    expect(p.take("b")).toBe("b-text");
  });

  test("same key does not start a second request", () => {
    const p = createPrefetch<string>();
    let calls = 0;
    const gen = () => {
      calls++;
      return new Promise<string>(() => {});
    };
    p.request("a", gen);
    p.request("a", gen);
    expect(calls).toBe(1);
  });

  test("cancel aborts and clears", async () => {
    const p = createPrefetch<string>();
    let signal: AbortSignal | undefined;
    p.request("a", (s) => {
      signal = s;
      return Promise.resolve("x");
    });
    p.cancel();
    await tick();
    expect(signal?.aborted).toBe(true);
    expect(p.take("a")).toBe(undefined);
  });

  test("failure or no result: offline, silently", async () => {
    const p = createPrefetch<string>();
    const d = deferred();
    p.request("a", () => d.promise);
    d.reject(new Error("down"));
    await tick();
    expect(p.take("a")).toBe(undefined);
    p.request("b", async () => undefined);
    await tick();
    expect(p.take("b")).toBe(undefined);
  });
});
