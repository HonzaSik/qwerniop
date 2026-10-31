export type SseEvent =
  | { type: "delta"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePayload(payload: string): SseEvent | null {
  if (payload === "[DONE]") return { type: "done" };
  let json: unknown;
  try {
    json = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!isRecord(json)) return null;
  const { error, choices } = json;
  if (error !== undefined) {
    const message = isRecord(error) ? error.message : error;
    return {
      type: "error",
      message: typeof message === "string" ? message : "Server error",
    };
  }
  if (!Array.isArray(choices)) return null;
  const choice: unknown = choices[0];
  if (!isRecord(choice) || !isRecord(choice.delta)) return null;
  const { content } = choice.delta;
  return typeof content === "string" && content !== ""
    ? { type: "delta", text: content }
    : null;
}

// Chunks may split a line anywhere, so the unfinished tail is kept for the next call.
export function createSseParser(): (chunk: string) => SseEvent[] {
  let tail = "";
  return (chunk) => {
    const lines = (tail + chunk).split("\n");
    tail = lines.pop() ?? "";
    const events: SseEvent[] = [];
    for (const raw of lines) {
      const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
      if (!line.startsWith("data:")) continue;
      const event = parsePayload(line.slice(5).trim());
      if (event) events.push(event);
    }
    return events;
  };
}
