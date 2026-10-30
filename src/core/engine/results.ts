import type { Session } from "./engine";

const CHARS_PER_WORD = 5;
const MS_PER_MINUTE = 60_000;

/** Milliseconds from the first key to the finish, or to the last key if unfinished. */
export function duration(session: Session): number {
  const { startedAt, finishedAt, lastKeyAt } = session;
  if (startedAt === undefined) return 0;
  return (finishedAt ?? lastKeyAt ?? startedAt) - startedAt;
}

/** Every attempt per minute, including wrong and retyped characters. */
export function grossWpm(session: Session): number {
  return wpm(session.log.length, session);
}

/** Characters now standing correct per minute. */
export function netWpm(session: Session): number {
  const usable = session.chars.filter(
    (char) => char.status === "correct" || char.status === "corrected",
  );
  return wpm(usable.length, session);
}

/** Fraction from 0 to 1 of attempted positions whose first attempt was correct. */
export function accuracy(session: Session): number {
  // Reads the log because status can't tell: a correct character that was
  // backspaced and retyped is `corrected` without ever having been wrong.
  const attempted = new Set<number>();
  let rightFirstTime = 0;
  for (const stroke of session.log) {
    if (attempted.has(stroke.index)) continue;
    attempted.add(stroke.index);
    if (stroke.correct) rightFirstTime++;
  }
  return attempted.size === 0 ? 0 : rightFirstTime / attempted.size;
}

function wpm(chars: number, session: Session): number {
  const minutes = duration(session) / MS_PER_MINUTE;
  return minutes > 0 ? chars / CHARS_PER_WORD / minutes : 0;
}
