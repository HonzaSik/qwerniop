import { expect, test } from "vitest";
import { apply, createSession } from "./engine";
import { sessionRecord } from "./record";

test("folds a session into a record with per-character error counts", () => {
  const session = createSession({ text: "ab", errorMode: "stop" });
  apply(session, { kind: "char", char: "x", at: 0 });
  apply(session, { kind: "char", char: "x", at: 10 });
  apply(session, { kind: "char", char: "a", at: 20 });
  apply(session, { kind: "char", char: "b", at: 60_000 });
  const r = sessionRecord(session, "en-us", { track: "letters", stage: 2 }, 99);
  expect(r).toMatchObject({
    at: 99,
    layout: "en-us",
    mode: "stop",
    lesson: { track: "letters", stage: 2 },
    durationMs: 60_000,
    errors: { a: 2 },
  });
  expect(r.accuracy).toBe(0.5);
});
