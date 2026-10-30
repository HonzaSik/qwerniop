import { describe, expect, test } from "vitest";
import { apply, createSession } from "../engine/engine";
import { accuracy } from "../engine/results";
import { type CharStat, foldSession, parseCharStats } from "./chars";

type Mode = "stop" | "continue";
function run(text: string, errorMode: Mode, keys: [string, number][]) {
  const s = createSession({ text, errorMode });
  for (const [char, at] of keys) {
    apply(
      s,
      char === "\b" ? { kind: "backspace", at } : { kind: "char", char, at },
    );
  }
  return s;
}

const stat: CharStat = {
  attempts: 3,
  correct: 2,
  accuracy: 0.91,
  timed: 1,
  ms: 200,
  totalMs: 200,
};

describe("foldSession", () => {
  test("counts first attempts and averages accuracy and time", () => {
    const s = run("aaa", "continue", [
      ["a", 0],
      ["x", 100],
      ["a", 300],
    ]);
    const a = foldSession({}, s.log).a;
    expect(a?.attempts).toBe(3);
    expect(a?.correct).toBe(2);
    expect(a?.accuracy).toBeCloseTo(0.91);
    expect(a).toMatchObject({ timed: 1, ms: 200, totalMs: 200 });
  });

  test("a later time sample moves the average by 0.1", () => {
    const s = run("ba", "continue", [
      ["b", 0],
      ["a", 400],
    ]);
    const got = foldSession({ a: stat }, s.log).a;
    expect(got?.ms).toBeCloseTo(220);
    expect(got).toMatchObject({ timed: 2, totalMs: 600 });
  });

  test("skips wrong attempts and pauses for time", () => {
    const s = run("ab", "stop", [
      ["x", 0],
      ["x", 10],
      ["a", 20],
      ["b", 60_000],
    ]);
    const got = foldSession({}, s.log);
    expect(got.a).toMatchObject({ attempts: 1, correct: 0, accuracy: 0 });
    expect(got.b).toMatchObject({ attempts: 1, correct: 1, timed: 0 });
  });

  test("a retyped position adds nothing", () => {
    const s = run("ab", "continue", [
      ["a", 0],
      ["x", 100],
      ["\b", 200],
      ["b", 300],
    ]);
    const got = foldSession({}, s.log);
    expect(got.b?.attempts).toBe(1);
    expect(got.b?.correct).toBe(0);
  });

  test("attempts add up to the positions session accuracy counts", () => {
    const s = run("abca", "continue", [
      ["a", 0],
      ["x", 50],
      ["\b", 100],
      ["b", 150],
      ["c", 200],
      ["a", 250],
    ]);
    const total = Object.values(foldSession({}, s.log)).reduce(
      (n, c) => n + c.attempts,
      0,
    );
    const right = Object.values(foldSession({}, s.log)).reduce(
      (n, c) => n + c.correct,
      0,
    );
    expect(right / total).toBe(accuracy(s));
    expect(total).toBe(4);
  });

  test("does not mutate its input", () => {
    const input = { a: { ...stat } };
    foldSession(input, run("a", "stop", [["a", 0]]).log);
    expect(input).toEqual({ a: stat });
  });
});

describe("parseCharStats", () => {
  test.each([undefined, null, 3, "x", [stat]])("reads %j as empty", (v) => {
    expect(parseCharStats(v)).toEqual({});
  });

  test("round-trips valid stats", () => {
    expect(parseCharStats({ a: stat })).toEqual({ a: stat });
  });

  test("drops bad entries and keys, keeps the rest", () => {
    const got = parseCharStats(
      JSON.parse(
        JSON.stringify({
          a: stat,
          b: { ...stat, attempts: -1 },
          c: { ...stat, accuracy: 1.5 },
          d: { ...stat, correct: 4 },
          e: { ...stat, ms: "1" },
          ab: stat,
        }).replace('"ab"', '"__proto__"'),
      ),
    );
    expect(Object.keys(got)).toEqual(["a"]);
  });

  test("keeps an astral character", () => {
    expect(Object.keys(parseCharStats({ "😀": stat }))).toEqual(["😀"]);
  });
});
