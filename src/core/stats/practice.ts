import type { SessionRecord } from "../engine/record";

const pad = (n: number): string => String(n).padStart(2, "0");

/** The local calendar day of an epoch time, as "YYYY-MM-DD". */
export function dayKey(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Counted from the date alone, so a daylight saving change cannot shift a gap by a day.
export const dayNumber = (key: string): number =>
  Date.UTC(
    Number(key.slice(0, 4)),
    Number(key.slice(5, 7)) - 1,
    Number(key.slice(8)),
  ) / 86_400_000;

export interface DayPractice {
  ms: number;
  sessions: number;
}

/** Time and sessions per local day, over every layout: practice belongs to the learner, not the layout. */
export function practiceByDay(
  records: readonly SessionRecord[],
): Map<string, DayPractice> {
  const days = new Map<string, DayPractice>();
  for (const r of records) {
    const key = dayKey(r.at);
    const day = days.get(key) ?? { ms: 0, sessions: 0 };
    days.set(key, { ms: day.ms + r.durationMs, sessions: day.sessions + 1 });
  }
  return days;
}

/**
 * Weeks of one month (month 0–11) as rows of seven day keys; days outside the
 * month are undefined so every row has seven cells.
 */
export function monthGrid(
  year: number,
  month: number,
  weekStart: 0 | 1,
): (string | undefined)[][] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const length = new Date(year, month + 1, 0).getDate();
  const cells: (string | undefined)[] = Array.from(
    { length: lead },
    () => undefined,
  );
  for (let d = 1; d <= length; d++) {
    cells.push(dayKey(new Date(year, month, d).getTime()));
  }
  while (cells.length % 7 !== 0) cells.push(undefined);
  return Array.from({ length: cells.length / 7 }, (_, w) =>
    cells.slice(w * 7, w * 7 + 7),
  );
}

const MINUTE = 60_000;
const SPREAD_DAYS = 7;

/** How practice fell over the last week: days practised, and whole minutes per day practised. */
export interface Streak {
  /** Days in a row up to today; a day not yet practised does not break it until it ends. */
  current: number;
  /** The longest run ever. */
  best: number;
}

export function practiceStreak(
  days: ReadonlyMap<string, DayPractice>,
  today: number,
): Streak {
  const practised = [...days.keys()].map(dayNumber).sort((a, b) => a - b);
  let run = 0;
  let best = 0;
  practised.forEach((day, i) => {
    run = i > 0 && day === (practised[i - 1] ?? 0) + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  const last = practised.at(-1);
  const alive = last !== undefined && dayNumber(dayKey(today)) - last <= 1;
  return { current: alive ? run : 0, best };
}

export function recentSpread(
  days: ReadonlyMap<string, DayPractice>,
  today: number,
): { days: number; minutes: number } {
  const now = new Date(today);
  let count = 0;
  let ms = 0;
  for (let i = 0; i < SPREAD_DAYS; i++) {
    const day = days.get(
      dayKey(
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - i,
        ).getTime(),
      ),
    );
    if (day) {
      count++;
      ms += day.ms;
    }
  }
  return {
    days: count,
    // At least 1: a day practised should not read as zero minutes.
    minutes: count === 0 ? 0 : Math.max(1, Math.round(ms / count / MINUTE)),
  };
}

/** Fixed minute steps rather than quartiles, so a level means the same thing every month. */
export function practiceLevel(ms: number): 0 | 1 | 2 | 3 | 4 {
  if (ms <= 0) return 0;
  if (ms < 5 * MINUTE) return 1;
  if (ms < 15 * MINUTE) return 2;
  if (ms < 30 * MINUTE) return 3;
  return 4;
}
