export type ErrorMode = "stop" | "continue";

export interface SessionConfig {
  text: string;
  errorMode: ErrorMode;
}

export type InputEvent =
  | { kind: "char"; char: string; at: number }
  | { kind: "backspace"; at: number };

export interface CharState {
  expected: string;
  typed?: string;
  status: "pending" | "correct" | "corrected" | "wrong";
}

export interface Keystroke {
  index: number;
  expected: string;
  typed: string;
  correct: boolean;
  at: number;
  sincePrevious: number;
}

export interface Session {
  config: SessionConfig;
  chars: CharState[];
  cursor: number;
  startedAt?: number;
  finishedAt?: number;
  log: Keystroke[];
}

/** The character indices an event changed, so the UI updates only those spans. */
export type Change = readonly number[];

export function createSession(config: SessionConfig): Session {
  return {
    config,
    // Split by code point: indexing the string would cut astral characters in half.
    chars: Array.from(config.text, (expected) => ({
      expected,
      status: "pending",
    })),
    cursor: 0,
    log: [],
  };
}

/** Mutates the session in place: this runs on every keystroke. */
export function apply(session: Session, event: InputEvent): Change {
  if (session.finishedAt !== undefined) return [];
  return event.kind === "char"
    ? typeChar(session, event.char, event.at)
    : backspace(session);
}

function typeChar(session: Session, typed: string, at: number): Change {
  const index = session.cursor;
  const current = session.chars[index];
  if (current === undefined) return [];

  const correct = typed === current.expected;
  if (correct) {
    current.status =
      current.status === "wrong" || attemptedBefore(session, index)
        ? "corrected"
        : "correct";
  } else {
    current.status = "wrong";
  }
  current.typed = typed;

  session.startedAt ??= at;
  const previous = session.log.at(-1);
  session.log.push({
    index,
    expected: current.expected,
    typed,
    correct,
    at,
    sincePrevious: previous === undefined ? 0 : at - previous.at,
  });

  if (correct || session.config.errorMode === "continue") {
    session.cursor = index + 1;
    if (session.cursor === session.chars.length) session.finishedAt = at;
  }
  return [index];
}

function backspace(session: Session): Change {
  const index = session.cursor - 1;
  const previous = session.chars[index];
  // Undefined at the start of the text, where there is nothing to move back over.
  if (session.config.errorMode === "stop" || previous === undefined) return [];

  session.chars[index] = { expected: previous.expected, status: "pending" };
  session.cursor = index;
  return [index];
}

function attemptedBefore(session: Session, index: number): boolean {
  // Attempts advance the cursor and Backspace retreats it, so equal counts mean
  // no Backspace yet, which spares a clean run from scanning the log every time.
  if (session.log.length === session.cursor) return false;
  return session.log.some((stroke) => stroke.index === index);
}
