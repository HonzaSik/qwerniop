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
  status: "pending" | "correct" | "corrected" | "wrong" | "skipped";
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
  furthest: number;
  startedAt?: number;
  finishedAt?: number;
  lastKeyAt?: number;
  log: Keystroke[];
}

/** The character indices an event changed, so the UI updates only those spans. */
export type Change = readonly number[];

export function createSession(config: SessionConfig): Session {
  return {
    config,
    // NFC here covers every text source: a decomposed letter would be two positions no key can type.
    // Split by code point: indexing the string would cut astral characters in half.
    chars: Array.from(config.text.normalize("NFC"), (expected) => ({
      expected,
      status: "pending",
    })),
    cursor: 0,
    furthest: 0,
    log: [],
  };
}

/** Mutates the session in place: this runs on every keystroke. */
export function apply(session: Session, event: InputEvent): Change {
  if (session.finishedAt !== undefined) return [];
  return event.kind === "char"
    ? typeChar(session, event.char, event.at)
    : backspace(session, event.at);
}

function typeChar(session: Session, typed: string, at: number): Change {
  const index = session.cursor;
  const current = session.chars[index];
  if (current === undefined) return [];

  const correct = typed === current.expected;
  if (correct) {
    current.status =
      current.status === "wrong" || index < session.furthest
        ? "corrected"
        : "correct";
  } else {
    current.status = "wrong";
  }
  current.typed = typed;

  session.startedAt ??= at;
  session.log.push({
    index,
    expected: current.expected,
    typed,
    correct,
    at,
    sincePrevious: session.lastKeyAt === undefined ? 0 : at - session.lastKeyAt,
  });
  session.lastKeyAt = at;

  const changed = [index];
  if (correct || session.config.errorMode === "continue") {
    let cursor = index + 1;
    if (current.expected === "\n") {
      let next = session.chars[cursor];
      while (next?.expected === " " || next?.expected === "\t") {
        next.status = "skipped";
        changed.push(cursor);
        next = session.chars[++cursor];
      }
    }
    session.cursor = cursor;
    if (cursor > session.furthest) session.furthest = cursor;
    if (cursor === session.chars.length) session.finishedAt = at;
  }
  return changed;
}

function backspace(session: Session, at: number): Change {
  if (session.config.errorMode === "stop") return [];

  const changed: number[] = [];
  let index = session.cursor - 1;
  let previous = session.chars[index];
  // The learner never typed a skipped run, so one Backspace undoes the Enter before it.
  while (previous?.status === "skipped") {
    previous.status = "pending";
    changed.push(index);
    previous = session.chars[--index];
  }
  // Undefined at the start of the text, where there is nothing to move back over.
  if (previous === undefined) return [];

  session.chars[index] = { expected: previous.expected, status: "pending" };
  changed.push(index);
  session.cursor = index;
  session.lastKeyAt = at;
  return changed;
}
