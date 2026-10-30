import { describe, expect, test } from "vitest";
import { apply, createSession, type ErrorMode, type Session } from "./engine";

const BACKSPACE = "\b";

// Each character of `keys` is one event, 100 ms apart; "\b" stands for Backspace.
function run(text: string, errorMode: ErrorMode, keys: string): Session {
  const session = createSession({ text, errorMode });
  Array.from(keys).forEach((key, i) => {
    const at = (i + 1) * 100;
    apply(
      session,
      key === BACKSPACE
        ? { kind: "backspace", at }
        : { kind: "char", char: key, at },
    );
  });
  return session;
}

function statuses(session: Session): string[] {
  return session.chars.map((char) => char.status);
}

describe("createSession", () => {
  test("starts pending, with one state per code point", () => {
    const session = createSession({ text: "č😀", errorMode: "stop" });
    expect(session.chars).toEqual([
      { expected: "č", status: "pending" },
      { expected: "😀", status: "pending" },
    ]);
    expect(session.cursor).toBe(0);
    expect(session.startedAt).toBeUndefined();
    expect(session.finishedAt).toBeUndefined();
    expect(session.log).toEqual([]);
  });
});

describe.each<ErrorMode>(["stop", "continue"])("%s mode, shared", (mode) => {
  test("a clean run is all correct, starts and finishes", () => {
    const session = run("abc", mode, "abc");
    expect(statuses(session)).toEqual(["correct", "correct", "correct"]);
    expect(session.cursor).toBe(3);
    expect(session.startedAt).toBe(100);
    expect(session.finishedAt).toBe(300);
  });

  test("the first attempt starts the session, even when wrong", () => {
    expect(run("abc", mode, "x").startedAt).toBe(100);
  });

  test("Backspace at the start does nothing and does not start the session", () => {
    const session = createSession({ text: "abc", errorMode: mode });
    expect(apply(session, { kind: "backspace", at: 50 })).toEqual([]);
    expect(session.cursor).toBe(0);
    expect(session.startedAt).toBeUndefined();
    expect(session.log).toEqual([]);
  });

  test("events after the finish change nothing", () => {
    const session = run("a", mode, "a");
    expect(apply(session, { kind: "char", char: "a", at: 900 })).toEqual([]);
    expect(apply(session, { kind: "backspace", at: 950 })).toEqual([]);
    expect(session.cursor).toBe(1);
    expect(session.finishedAt).toBe(100);
    expect(session.log).toHaveLength(1);
  });

  test("empty text ignores input and never starts", () => {
    const session = run("", mode, "a");
    expect(session.startedAt).toBeUndefined();
    expect(session.finishedAt).toBeUndefined();
    expect(session.log).toEqual([]);
  });

  test("Czech characters match as single characters", () => {
    const session = run("čř", mode, "čř");
    expect(statuses(session)).toEqual(["correct", "correct"]);
    expect(session.finishedAt).toBe(200);
  });
});

describe("stop mode", () => {
  test("a wrong character is logged and the cursor stays", () => {
    const session = run("abc", "stop", "x");
    expect(session.cursor).toBe(0);
    expect(session.chars[0]).toEqual({
      expected: "a",
      typed: "x",
      status: "wrong",
    });
    expect(session.log).toEqual([
      {
        index: 0,
        expected: "a",
        typed: "x",
        correct: false,
        at: 100,
        sincePrevious: 0,
      },
    ]);
  });

  test("stays wrong until the right key, then corrected", () => {
    const session = run("abc", "stop", "xy");
    expect(statuses(session)[0]).toBe("wrong");
    expect(session.cursor).toBe(0);
    apply(session, { kind: "char", char: "a", at: 900 });
    expect(session.chars[0]).toEqual({
      expected: "a",
      typed: "a",
      status: "corrected",
    });
    expect(session.cursor).toBe(1);
    expect(session.log).toHaveLength(3);
  });

  test("characters after a corrected one are plain correct", () => {
    expect(statuses(run("abc", "stop", "xab"))).toEqual([
      "corrected",
      "correct",
      "pending",
    ]);
  });

  test("Backspace does nothing, even on a wrong character", () => {
    const session = run("abc", "stop", "ax");
    expect(apply(session, { kind: "backspace", at: 900 })).toEqual([]);
    expect(session.cursor).toBe(1);
    expect(statuses(session)).toEqual(["correct", "wrong", "pending"]);
  });

  test("a wrong last character does not finish; the right one does", () => {
    const session = run("ab", "stop", "ax");
    expect(session.finishedAt).toBeUndefined();
    apply(session, { kind: "char", char: "b", at: 900 });
    expect(session.finishedAt).toBe(900);
    expect(statuses(session)).toEqual(["correct", "corrected"]);
  });
});

describe("continue mode", () => {
  test("a wrong character is marked and the cursor advances", () => {
    const session = run("abc", "continue", "x");
    expect(session.cursor).toBe(1);
    expect(session.chars[0]).toEqual({
      expected: "a",
      typed: "x",
      status: "wrong",
    });
    expect(session.log[0]?.correct).toBe(false);
  });

  test("Backspace moves back one and resets that character", () => {
    const session = run("abc", "continue", `ax${BACKSPACE}`);
    expect(session.cursor).toBe(1);
    expect(session.chars[1]).toEqual({ expected: "b", status: "pending" });
    expect(session.log).toHaveLength(2);
  });

  test("a correct entry after Backspace is corrected", () => {
    const session = run("abc", "continue", `ax${BACKSPACE}b`);
    expect(statuses(session)).toEqual(["correct", "corrected", "pending"]);
  });

  test("retyping a character that was right before Backspace is corrected", () => {
    const session = run("abc", "continue", `ab${BACKSPACE}${BACKSPACE}ab`);
    expect(statuses(session)).toEqual(["corrected", "corrected", "pending"]);
  });

  test("a fresh character after a Backspace elsewhere is plain correct", () => {
    const session = run("abc", "continue", `a${BACKSPACE}ab`);
    expect(statuses(session)).toEqual(["corrected", "correct", "pending"]);
  });

  test("a wrong entry after Backspace is wrong again", () => {
    const session = run("abc", "continue", `x${BACKSPACE}y`);
    expect(statuses(session)[0]).toBe("wrong");
    expect(session.chars[0]?.typed).toBe("y");
  });

  test("Backspace crosses words but stops at index 0", () => {
    const session = run(
      "a b",
      "continue",
      `a ${BACKSPACE}${BACKSPACE}${BACKSPACE}`,
    );
    expect(session.cursor).toBe(0);
    expect(statuses(session)).toEqual(["pending", "pending", "pending"]);
  });

  test.each([
    ["abx", ["correct", "correct", "wrong"]],
    ["xbc", ["wrong", "correct", "correct"]],
    ["xbx", ["wrong", "correct", "wrong"]],
  ])("reaching the end finishes with errors left: %s", (keys, expected) => {
    const session = run("abc", "continue", keys);
    expect(session.finishedAt).toBe(300);
    expect(statuses(session)).toEqual(expected);
    expect(session.log.filter((stroke) => !stroke.correct)).toHaveLength(
      expected.filter((status) => status === "wrong").length,
    );
  });
});

describe("change", () => {
  test("names the one index each event touched", () => {
    const session = createSession({ text: "abc", errorMode: "continue" });
    expect(apply(session, { kind: "char", char: "a", at: 1 })).toEqual([0]);
    expect(apply(session, { kind: "char", char: "x", at: 2 })).toEqual([1]);
    expect(apply(session, { kind: "backspace", at: 3 })).toEqual([1]);
  });

  test("names the index of a wrong attempt in stop mode", () => {
    const session = createSession({ text: "abc", errorMode: "stop" });
    expect(apply(session, { kind: "char", char: "x", at: 1 })).toEqual([0]);
  });
});

describe("sincePrevious", () => {
  test("is 0 for the first attempt, then the gap between log entries", () => {
    const session = run("abc", "stop", "axb");
    expect(session.log.map((stroke) => stroke.sincePrevious)).toEqual([
      0, 100, 100,
    ]);
  });

  test("measures from the previous attempt across a Backspace", () => {
    const session = run("abc", "continue", `ax${BACKSPACE}b`);
    expect(session.log.map((stroke) => stroke.sincePrevious)).toEqual([
      0, 100, 200,
    ]);
  });
});
