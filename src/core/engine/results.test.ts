import { describe, expect, test } from "vitest";
import { apply, createSession, type ErrorMode, type Session } from "./engine";
import { accuracy, duration, grossWpm, netWpm } from "./results";

const BACKSPACE = "\b";
const ONE_MINUTE = 60_000;
const TEXT = "a".repeat(60);

// Each character of `keys` is one event; "\b" stands for Backspace. The first
// event is at 0 and the last at `totalMs`, so a run's duration is exact.
function run(
  text: string,
  errorMode: ErrorMode,
  keys: string,
  totalMs = ONE_MINUTE,
): Session {
  const session = createSession({ text, errorMode });
  const events = Array.from(keys);
  events.forEach((key, i) => {
    const at = i > 0 && i === events.length - 1 ? totalMs : i;
    apply(
      session,
      key === BACKSPACE
        ? { kind: "backspace", at }
        : { kind: "char", char: key, at },
    );
  });
  return session;
}

describe("a 60-character text in one minute with 5 errors", () => {
  test("stop mode: gross counts the wrong presses, net does not", () => {
    const session = run(TEXT, "stop", "xa".repeat(5) + "a".repeat(55));
    expect(session.log).toHaveLength(65);
    expect(duration(session)).toBe(ONE_MINUTE);
    expect(grossWpm(session)).toBe(13);
    expect(netWpm(session)).toBe(12);
    expect(accuracy(session)).toBe(55 / 60);
  });

  test("continue mode, errors left: both count only what was typed", () => {
    const session = run(TEXT, "continue", "x".repeat(5) + "a".repeat(55));
    expect(session.log).toHaveLength(60);
    expect(duration(session)).toBe(ONE_MINUTE);
    expect(grossWpm(session)).toBe(12);
    expect(netWpm(session)).toBe(11);
    expect(accuracy(session)).toBe(55 / 60);
  });

  test("continue mode, errors fixed with Backspace: same as stop mode", () => {
    const session = run(
      TEXT,
      "continue",
      `x${BACKSPACE}a`.repeat(5) + "a".repeat(55),
    );
    expect(session.log).toHaveLength(65);
    expect(duration(session)).toBe(ONE_MINUTE);
    expect(grossWpm(session)).toBe(13);
    expect(netWpm(session)).toBe(12);
    expect(accuracy(session)).toBe(55 / 60);
  });
});

describe("accuracy", () => {
  test("repeated wrong presses on one position count once", () => {
    expect(accuracy(run("ab", "stop", "xxxxab"))).toBe(1 / 2);
  });

  test("a correct character backspaced and retyped stays right first time", () => {
    const session = run("abc", "continue", `ab${BACKSPACE}b`);
    expect(session.chars[1]?.status).toBe("corrected");
    expect(accuracy(session)).toBe(1);
  });

  test("a wrong first attempt still counts after it is fixed", () => {
    expect(accuracy(run("ab", "continue", `x${BACKSPACE}ab`))).toBe(1 / 2);
  });
});

describe("net WPM", () => {
  test("a character retyped after Backspace counts once, gross counts both", () => {
    const session = run("abc", "continue", `ab${BACKSPACE}b`, 6000);
    expect(netWpm(session)).toBeCloseTo(4);
    expect(grossWpm(session)).toBeCloseTo(6);
  });

  test("a character backspaced away no longer counts", () => {
    const session = run("abc", "continue", `ab${BACKSPACE}`, 6000);
    expect(netWpm(session)).toBeCloseTo(2);
    expect(grossWpm(session)).toBeCloseTo(4);
  });
});

describe("duration", () => {
  test("is 0 for an unstarted session", () => {
    expect(duration(createSession({ text: "abc", errorMode: "stop" }))).toBe(0);
  });

  test("runs to the last key while unfinished", () => {
    expect(duration(run("abc", "stop", "ab", 6000))).toBe(6000);
  });

  test("includes a Backspace as the last key", () => {
    expect(duration(run("abc", "continue", `ab${BACKSPACE}`, 6000))).toBe(6000);
  });

  test("stops at the finish, ignoring keys after it", () => {
    expect(duration(run("ab", "stop", "abcc", 6000))).toBe(1);
  });
});

describe("sessions with nothing to measure", () => {
  const cases: [string, Session][] = [
    ["unstarted", createSession({ text: "abc", errorMode: "stop" })],
    ["empty text", run("", "continue", "a")],
    ["only a Backspace", run("abc", "continue", BACKSPACE)],
  ];

  test.each(cases)("%s: every result is 0", (_, session) => {
    expect(duration(session)).toBe(0);
    expect(grossWpm(session)).toBe(0);
    expect(netWpm(session)).toBe(0);
    expect(accuracy(session)).toBe(0);
  });

  test("zero duration: WPM is 0, accuracy still measures the attempt", () => {
    const session = run("a", "stop", "a");
    expect(session.finishedAt).toBe(session.startedAt);
    expect(duration(session)).toBe(0);
    expect(grossWpm(session)).toBe(0);
    expect(netWpm(session)).toBe(0);
    expect(accuracy(session)).toBe(1);
  });

  test("an unfinished session with only errors gives finite results", () => {
    const session = run("abc", "continue", "xy", 6000);
    expect(grossWpm(session)).toBeCloseTo(4);
    expect(netWpm(session)).toBe(0);
    expect(accuracy(session)).toBe(0);
  });
});

describe("Czech text", () => {
  test("each accented character counts as one character", () => {
    const session = run("čĚřŮž", "continue", "čĚrŮž", 6000);
    expect(session.log).toHaveLength(5);
    expect(grossWpm(session)).toBeCloseTo(10);
    expect(netWpm(session)).toBeCloseTo(8);
    expect(accuracy(session)).toBe(4 / 5);
  });
});

describe("skipped indentation", () => {
  test("counts in neither WPM nor accuracy", () => {
    const session = run("a:\n    b", "stop", "a:\nb");
    expect(session.finishedAt).toBe(ONE_MINUTE);
    expect(grossWpm(session)).toBe(0.8);
    expect(netWpm(session)).toBe(0.8);
    expect(accuracy(session)).toBe(1);
  });
});
