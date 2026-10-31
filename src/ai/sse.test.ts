import { describe, expect, test } from "vitest";
import { createSseParser } from "./sse";

const delta = (text: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;

describe("createSseParser", () => {
  test("reads several events from one chunk", () => {
    const parse = createSseParser();
    expect(parse(delta("a") + delta("b"))).toEqual([
      { type: "delta", text: "a" },
      { type: "delta", text: "b" },
    ]);
  });

  test("joins a line split across chunks", () => {
    const parse = createSseParser();
    const whole = delta("hello");
    expect(parse(whole.slice(0, 20))).toEqual([]);
    expect(parse(whole.slice(20))).toEqual([{ type: "delta", text: "hello" }]);
  });

  test("handles CRLF line endings", () => {
    const parse = createSseParser();
    expect(parse(delta("x").replaceAll("\n", "\r\n"))).toEqual([
      { type: "delta", text: "x" },
    ]);
  });

  test("reads [DONE]", () => {
    expect(createSseParser()("data: [DONE]\n\n")).toEqual([{ type: "done" }]);
  });

  test("skips malformed, comment and empty-delta lines", () => {
    const parse = createSseParser();
    const input = [
      ": keep-alive",
      "data: {not json",
      "data: 42",
      'data: {"choices":[]}',
      'data: {"choices":[{"delta":{"role":"assistant"}}]}',
      'data: {"choices":[{"delta":{"content":""}}]}',
      "event: ping",
      "",
    ].join("\n");
    expect(parse(input)).toEqual([]);
  });

  test("reports error payloads", () => {
    const parse = createSseParser();
    expect(parse('data: {"error":{"message":"boom"}}\n')).toEqual([
      { type: "error", message: "boom" },
    ]);
    expect(parse('data: {"error":"plain"}\n')).toEqual([
      { type: "error", message: "plain" },
    ]);
    expect(parse('data: {"error":{}}\n')).toEqual([
      { type: "error", message: "Server error" },
    ]);
  });
});
