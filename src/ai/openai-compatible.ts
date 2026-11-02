import {
  type GenerateRequest,
  ProviderError,
  type TextProvider,
} from "./provider";
import { createSseParser } from "./sse";

export interface OpenAiOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
  firstTokenMs?: number;
  totalMs?: number;
  fetch?: typeof fetch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createOpenAiProvider(options: OpenAiOptions): TextProvider {
  const base = options.baseUrl.replace(/\/+$/, "");
  const doFetch = options.fetch ?? ((...args) => fetch(...args));
  const firstTokenMs = options.firstTokenMs ?? 5000;
  const totalMs = options.totalMs ?? 30000;

  const headers = (): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (options.apiKey) h.Authorization = `Bearer ${options.apiKey}`;
    return h;
  };

  async function send(
    path: string,
    init: RequestInit,
    signal: AbortSignal,
  ): Promise<Response> {
    let response: Response;
    try {
      response = await doFetch(base + path, { ...init, signal });
    } catch (error) {
      if (error instanceof TypeError) {
        throw new ProviderError("network", error.message);
      }
      throw error;
    }
    if (!response.ok) {
      throw new ProviderError("http", `HTTP ${response.status}`);
    }
    return response;
  }

  return {
    async listModels(signal) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), firstTokenMs);
      const onAbort = () => controller.abort();
      signal?.addEventListener("abort", onAbort);
      try {
        const response = await send(
          "/models",
          { headers: headers() },
          controller.signal,
        );
        const json: unknown = await response.json();
        if (!isRecord(json) || !Array.isArray(json.data)) {
          throw new ProviderError("bad-response", "No model list");
        }
        return json.data.flatMap((m: unknown) =>
          isRecord(m) && typeof m.id === "string" ? [m.id] : [],
        );
      } catch (error) {
        if (controller.signal.aborted && !signal?.aborted) {
          throw new ProviderError("timeout", "Timed out");
        }
        throw error;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      }
    },

    async *stream(request: GenerateRequest, signal) {
      const controller = new AbortController();
      let timedOut = false;
      const timeout = () => {
        timedOut = true;
        controller.abort();
      };
      const firstTimer = setTimeout(timeout, firstTokenMs);
      const totalTimer = setTimeout(timeout, totalMs);
      const onAbort = () => controller.abort();
      signal?.addEventListener("abort", onAbort);
      try {
        const post = (extra: Record<string, unknown>) =>
          send(
            "/chat/completions",
            {
              method: "POST",
              headers: headers(),
              body: JSON.stringify({
                model: options.model,
                stream: true,
                max_tokens: request.maxTokens,
                temperature: request.temperature,
                messages: [
                  { role: "system", content: request.system },
                  { role: "user", content: request.prompt },
                ],
                ...extra,
              }),
            },
            controller.signal,
          );
        // A thinking model otherwise spends max_tokens on reasoning and writes nothing. Not every server knows the option.
        const response = await post({ reasoning_effort: "none" }).catch(
          (error: unknown) => {
            if (
              error instanceof ProviderError &&
              error.message === "HTTP 400"
            ) {
              return post({});
            }
            throw error;
          },
        );
        if (!response.body) {
          throw new ProviderError("bad-response", "No response body");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const parse = createSseParser();
        for (;;) {
          const { done, value } = await reader.read();
          const events = parse(
            done
              ? `${decoder.decode()}\n`
              : decoder.decode(value, { stream: true }),
          );
          for (const event of events) {
            if (event.type === "done") return;
            if (event.type === "error") {
              throw new ProviderError("server", event.message);
            }
            clearTimeout(firstTimer);
            yield event.text;
          }
          if (done) return;
        }
      } catch (error) {
        if (timedOut) throw new ProviderError("timeout", "Timed out");
        throw error;
      } finally {
        clearTimeout(firstTimer);
        clearTimeout(totalTimer);
        signal?.removeEventListener("abort", onAbort);
        controller.abort();
      }
    },
  };
}
