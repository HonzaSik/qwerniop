import { describe, expect, test } from "vitest";
import type { Keystroke } from "../engine/engine";
import type { SessionRecord } from "../engine/record";
import { csQwertz } from "../layouts/cs-qwertz";
import { enUs } from "../layouts/en-us";
import {
  foldPairs,
  parsePairs,
  slowestPairs,
  transitionSummary,
  transitionTimes,
} from "./pairs";

/** A log typed in order: every stroke correct and `gap` ms after the last, unless overridden. */
const typed = (text: string, gap = 100): Keystroke[] =>
  [...text].map((expected, index) => ({
    index,
    expected,
    typed: expected,
    correct: true,
    at: index * gap,
    sincePrevious: index === 0 ? 0 : gap,
  }));

describe("foldPairs", () => {
  test("counts adjacent lowercase letters and their time", () => {
    const got = foldPairs(enUs, {}, typed("the"));
    expect(Object.keys(got).sort()).toEqual(["he", "th"]);
    expect(got.th).toEqual({
      attempts: 1,
      correct: 1,
      timed: 1,
      totalMs: 100,
      ms: 100,
      earlyMs: 100,
    });
  });

  test("spaces, capitals, digits and punctuation make no pair", () => {
    expect(Object.keys(foldPairs(enUs, {}, typed("a b Cd e1 f.g")))).toEqual(
      [],
    );
  });

  test("non-ASCII lowercase letters are pairs too", () => {
    expect(Object.keys(foldPairs(enUs, {}, typed("čá")))).toEqual(["čá"]);
  });

  test("a wrong second letter counts against the pair and has no time", () => {
    const log = typed("th");
    log[1] = { ...(log[1] as Keystroke), typed: "x", correct: false };
    expect(foldPairs(enUs, {}, log).th).toMatchObject({
      attempts: 1,
      correct: 0,
      timed: 0,
    });
  });

  test("a wrong first letter leaves the pair out: its timing is about the error", () => {
    const log = typed("th");
    log[0] = { ...(log[0] as Keystroke), typed: "x", correct: false };
    expect(foldPairs(enUs, {}, log)).toEqual({});
  });

  test("a retried letter is not a new attempt, and what follows it is not a pair", () => {
    const log: Keystroke[] = [
      {
        index: 0,
        expected: "t",
        typed: "t",
        correct: true,
        at: 0,
        sincePrevious: 0,
      },
      {
        index: 1,
        expected: "h",
        typed: "x",
        correct: false,
        at: 100,
        sincePrevious: 100,
      },
      {
        index: 1,
        expected: "h",
        typed: "h",
        correct: true,
        at: 200,
        sincePrevious: 100,
      },
      {
        index: 2,
        expected: "e",
        typed: "e",
        correct: true,
        at: 300,
        sincePrevious: 100,
      },
    ];
    const got = foldPairs(enUs, {}, log);
    expect(got.th?.attempts).toBe(1);
    expect(got.he).toBeUndefined();
  });

  test("a long hesitation counts as an attempt but not as speed", () => {
    expect(foldPairs(enUs, {}, typed("th", 2500)).th).toMatchObject({
      attempts: 1,
      timed: 0,
    });
  });

  test("earlyMs is the mean of the first 30 samples and then stays put", () => {
    let stats = {};
    for (let i = 0; i < 30; i++)
      stats = foldPairs(enUs, stats, typed("th", 200));
    for (let i = 0; i < 30; i++)
      stats = foldPairs(enUs, stats, typed("th", 100));
    const got = foldPairs(enUs, stats, typed("th", 100)).th;
    expect(got?.earlyMs).toBe(200);
    expect(got?.timed).toBe(61);
    expect(got?.ms).toBeLessThan(150);
  });

  test("a letter that takes two presses counts as an attempt but not as speed", () => {
    expect(foldPairs(csQwertz, {}, typed("dó")).dó).toMatchObject({
      attempts: 1,
      correct: 1,
      timed: 0,
    });
    expect(foldPairs(csQwertz, {}, typed("ód")).ód?.timed).toBe(1);
  });

  test("does not change the stats it was given", () => {
    const before = foldPairs(enUs, {}, typed("th"));
    const copy = structuredClone(before);
    foldPairs(enUs, before, typed("th"));
    expect(before).toEqual(copy);
  });
});

describe("parsePairs", () => {
  const good = {
    attempts: 2,
    correct: 1,
    timed: 1,
    totalMs: 100,
    ms: 100,
    earlyMs: 100,
  };

  test("keeps valid entries", () => {
    expect(parsePairs({ th: good })).toEqual({ th: good });
  });

  test("anything else reads as empty", () => {
    expect(parsePairs(undefined)).toEqual({});
    expect(parsePairs([])).toEqual({});
  });

  test.each([
    ["t", good],
    ["the", good],
    ["TH", good],
    ["th", { ...good, attempts: -1 }],
    ["th", { ...good, ms: "x" }],
    ["th", { ...good, correct: 3 }],
    ["th", null],
  ])("drops %s %j and keeps the rest", (key, value) => {
    expect(parsePairs({ [key]: value, he: good })).toEqual({ he: good });
  });
});

describe("slowestPairs", () => {
  const stat = (ms: number, attempts = 50, earlyMs = ms, timed = attempts) => ({
    attempts,
    correct: attempts,
    timed,
    totalMs: ms * timed,
    ms,
    earlyMs,
  });

  test("ranks by total time lost, so a common pair beats a rare slower one", () => {
    const got = slowestPairs({
      aa: stat(100),
      bb: stat(100),
      cc: stat(100),
      rare: stat(100),
      ra: stat(300, 21),
      co: stat(200, 200),
    });
    expect(got.map((r) => r.pair)).toEqual(["co", "ra"]);
  });

  test("leaves out pairs without enough samples and pairs at or under the median", () => {
    const got = slowestPairs({
      aa: stat(100),
      bb: stat(150),
      cc: stat(200),
      thin: stat(900, 19),
    });
    expect(got.map((r) => r.pair)).toEqual(["cc"]);
  });

  test("gives accuracy, and a change only once the samples go beyond the early ones", () => {
    const rows = slowestPairs({
      aa: stat(100),
      bb: stat(100),
      old: { ...stat(180, 60, 250), correct: 45 },
      new: stat(200, 25, 300),
    });
    const old = rows.find((r) => r.pair === "old");
    expect(old?.accuracy).toBe(0.75);
    expect(old?.change).toBe(-70);
    expect(rows.find((r) => r.pair === "new")?.change).toBeUndefined();
  });

  test("time lost counts timed samples, not attempts that were never timed", () => {
    const got = slowestPairs({
      aa: stat(100),
      bb: stat(100),
      cc: stat(100),
      missed: stat(200, 500, 200, 20),
      timed: stat(200, 60),
    });
    expect(got.map((r) => r.pair)).toEqual(["timed", "missed"]);
  });

  test("stops at the limit", () => {
    const many = Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [
        `a${String.fromCharCode(97 + (i % 26))}${i}`,
        stat(100 + i),
      ]),
    );
    expect(slowestPairs(many)).toHaveLength(10);
  });
});

describe("transitionTimes", () => {
  test("sorts pairs by what the hands do", () => {
    // en-us: f-j other hand, f-d same hand, f-r same finger, f-f same key.
    expect(transitionTimes(enUs, typed("fj"))).toEqual({
      hands: { ms: 100, count: 1 },
    });
    expect(transitionTimes(enUs, typed("fd"))).toEqual({
      fingers: { ms: 100, count: 1 },
    });
    expect(transitionTimes(enUs, typed("fr"))).toEqual({
      finger: { ms: 100, count: 1 },
    });
    expect(transitionTimes(enUs, typed("ff"))).toEqual({
      repeat: { ms: 100, count: 1 },
    });
  });

  test("adds up over a session", () => {
    expect(transitionTimes(enUs, typed("fjf", 50))).toEqual({
      hands: { ms: 100, count: 2 },
    });
  });

  test("skips characters that take Shift or two strokes", () => {
    expect(transitionTimes(enUs, typed("fJ"))).toEqual({});
    expect(transitionTimes(csQwertz, typed("dó"))).toEqual({});
  });

  test("works on the Czech layout", () => {
    expect(transitionTimes(csQwertz, typed("fj"))).toEqual({
      hands: { ms: 100, count: 1 },
    });
  });
});

describe("transitionSummary", () => {
  const record = (at: number, ms: number, count = 10): SessionRecord => ({
    at,
    layout: "en-us",
    mode: "stop",
    lesson: { track: "letters", stage: 1 },
    wpm: 30,
    accuracy: 1,
    durationMs: 1000,
    errors: {},
    transitions: { hands: { ms: ms * count, count } },
  });

  test("compares recent sessions with the ones before, in any stored order", () => {
    const records = [
      ...Array.from({ length: 10 }, (_, i) => record(100 + i, 100)),
      ...Array.from({ length: 10 }, (_, i) => record(i, 200)),
    ];
    expect(transitionSummary(records, "en-us")).toEqual([
      { kind: "hands", recent: 100, earlier: 200 },
    ]);
  });

  test("no earlier figure until there are earlier sessions with enough samples", () => {
    expect(transitionSummary([record(1, 100, 20)], "en-us")).toEqual([
      { kind: "hands", recent: 100, earlier: undefined },
    ]);
  });

  test("a class with too few recent samples is left out", () => {
    expect(transitionSummary([record(1, 100, 19)], "en-us")).toEqual([]);
  });

  test("sessions with no letter pairs do not use up the window", () => {
    const records = [
      record(1, 100, 20),
      ...Array.from({ length: 10 }, (_, i) => ({
        ...record(10 + i, 0),
        transitions: {},
      })),
    ];
    expect(transitionSummary(records, "en-us")).toEqual([
      { kind: "hands", recent: 100, earlier: undefined },
    ]);
  });

  test("other layouts and older records without the field are ignored", () => {
    const { transitions: _gone, ...old } = record(5, 500);
    expect(
      transitionSummary(
        [old, { ...record(6, 500, 20), layout: "cs-qwertz" }],
        "en-us",
      ),
    ).toEqual([]);
  });
});
