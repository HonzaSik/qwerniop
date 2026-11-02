import { describe, expect, test, vi } from "vitest";
import { createOpenAiProvider } from "./openai-compatible";
import { ProviderError } from "./provider";

const request = { system: "s", prompt: "p", maxTokens: 10, temperature: 0.5 };
const enc = new TextEncoder();

const chunk = (text: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;

function streamOf(
  parts: string[],
  hang = false,
  signal?: AbortSignal | null,
): Response {
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (const p of parts) c.enqueue(enc.encode(p));
      if (!hang) c.close();
      // A real fetch body errors when its request is aborted.
      signal?.addEventListener("abort", () =>
        c.error(new DOMException("aborted", "AbortError")),
      );
    },
  });
  return new Response(body, { status: 200 });
}

function fakeFetch(respond: (init: RequestInit) => Promise<Response>) {
  return vi.fn((_url: RequestInfo | URL, init?: RequestInit) =>
    respond(init ?? {}),
  );
}

async function collect(it: AsyncIterable<string>) {
  const out: string[] = [];
  for await (const s of it) out.push(s);
  return out;
}

const make = (f: ReturnType<typeof fakeFetch>, extra = {}) =>
  createOpenAiProvider({
    baseUrl: "http://x/v1/",
    model: "m",
    fetch: f,
    ...extra,
  });

describe("stream", () => {
  test("yields deltas, stops at [DONE], sends the request", async () => {
    const f = fakeFetch(async () =>
      streamOf([chunk("Hel"), chunk("lo"), "data: [DONE]\n\n", chunk("late")]),
    );
    const out = await collect(make(f, { apiKey: "k" }).stream(request));
    expect(out).toEqual(["Hel", "lo"]);
    const [url, init] = f.mock.calls[0] ?? [];
    expect(url).toBe("http://x/v1/chat/completions");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer k" });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "m",
      stream: true,
      max_tokens: 10,
      temperature: 0.5,
    });
  });

  test("handles events split mid-line and mid-character", async () => {
    const bytes = enc.encode(chunk("ř"));
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes.slice(0, 40));
        c.enqueue(bytes.slice(40));
        c.close();
      },
    });
    const f = fakeFetch(async () => new Response(body));
    expect(await collect(make(f).stream(request))).toEqual(["ř"]);
  });

  test("omits Authorization without a key", async () => {
    const f = fakeFetch(async () => streamOf(["data: [DONE]\n\n"]));
    await collect(make(f).stream(request));
    expect(f.mock.calls[0]?.[1]?.headers).not.toHaveProperty("Authorization");
  });

  test("asks the model not to spend its tokens on reasoning", async () => {
    const f = fakeFetch(async () =>
      streamOf([chunk("hi"), "data: [DONE]\n\n"]),
    );
    const p = createOpenAiProvider({
      baseUrl: "http://x",
      model: "m",
      fetch: f,
    });
    await collect(p.stream(request));
    const body = JSON.parse(String(f.mock.calls[0]?.[1]?.body));
    expect(body.reasoning_effort).toBe("none");
  });

  test("a server that rejects that option gets the request without it", async () => {
    const f = fakeFetch(async (init) =>
      String(init.body).includes("reasoning_effort")
        ? new Response("", { status: 400 })
        : streamOf([chunk("hi"), "data: [DONE]\n\n"]),
    );
    const p = createOpenAiProvider({
      baseUrl: "http://x",
      model: "m",
      fetch: f,
    });
    expect(await collect(p.stream(request))).toEqual(["hi"]);
    expect(f).toHaveBeenCalledTimes(2);
  });

  test("HTTP error", async () => {
    const f = fakeFetch(async () => new Response("", { status: 500 }));
    await expect(collect(make(f).stream(request))).rejects.toMatchObject({
      kind: "http",
    });
  });

  test("fetch TypeError becomes a network error", async () => {
    const f = fakeFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(collect(make(f).stream(request))).rejects.toMatchObject({
      kind: "network",
    });
  });

  test("error payload in the stream", async () => {
    const f = fakeFetch(async () =>
      streamOf([chunk("a"), 'data: {"error":{"message":"oom"}}\n\n']),
    );
    const it = make(f).stream(request);
    await expect(collect(it)).rejects.toMatchObject({
      kind: "server",
      message: "oom",
    });
  });

  test("times out waiting for the first token", async () => {
    const f = fakeFetch(async (init) => streamOf([], true, init.signal));
    await expect(
      collect(make(f, { firstTokenMs: 10 }).stream(request)),
    ).rejects.toMatchObject({ kind: "timeout" });
  });

  test("caller abort stops the stream without a timeout error", async () => {
    const ac = new AbortController();
    const f = fakeFetch(async (init) => {
      return streamOf([chunk("a")], true, init.signal);
    });
    const seen: string[] = [];
    const run = async () => {
      for await (const s of make(f).stream(request, ac.signal)) {
        seen.push(s);
        ac.abort();
      }
    };
    await expect(run()).rejects.not.toBeInstanceOf(ProviderError);
    expect(seen).toEqual(["a"]);
  });
});

describe("listModels", () => {
  test("returns ids and skips malformed entries", async () => {
    const f = fakeFetch(
      async () =>
        new Response(JSON.stringify({ data: [{ id: "a" }, { id: 1 }, null] })),
    );
    expect(await make(f).listModels()).toEqual(["a"]);
    expect(f.mock.calls[0]?.[0]).toBe("http://x/v1/models");
  });

  test("rejects a body without data", async () => {
    const f = fakeFetch(async () => new Response("{}"));
    await expect(make(f).listModels()).rejects.toMatchObject({
      kind: "bad-response",
    });
  });
});
