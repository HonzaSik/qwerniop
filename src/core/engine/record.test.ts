import { expect, test } from "vitest";
import { apply, createSession } from "./engine";
import { parseSessionRecord, sessionRecord } from "./record";

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

const valid = {
  at: 1,
  layout: "en-us",
  mode: "stop",
  lesson: { track: "letters", stage: 2 },
  wpm: 40,
  accuracy: 0.9,
  durationMs: 1000,
  errors: { a: 1 },
};

test("parseSessionRecord keeps a valid record", () => {
  expect(parseSessionRecord(valid)).toEqual(valid);
});

test("parseSessionRecord keeps transitions and drops bad ones alone", () => {
  const hands = { ms: 500, count: 5 };
  expect(
    parseSessionRecord({
      ...valid,
      transitions: { hands, finger: { ms: "x", count: 1 }, nope: hands },
    }),
  ).toEqual({ ...valid, transitions: { hands } });
});

test("parseSessionRecord keeps a custom text session", () => {
  const custom = { ...valid, lesson: { track: "custom", stage: 0 } };
  expect(parseSessionRecord(custom)).toEqual(custom);
});

test.each([
  null,
  "x",
  [],
  { ...valid, wpm: "40" },
  { ...valid, accuracy: 2 },
  { ...valid, at: Number.NaN },
  { ...valid, layout: "dvorak" },
  { ...valid, mode: "x" },
  { ...valid, lesson: { track: "nope", stage: 1 } },
  { ...valid, lesson: { track: "letters", stage: 1.5 } },
  { ...valid, errors: { a: -1 } },
  { ...valid, errors: null },
])("parseSessionRecord drops %j without throwing", (value) => {
  expect(parseSessionRecord(value)).toBeNull();
});
