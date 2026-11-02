import type { SessionRecord } from "../engine/record";

const pad = (n: number): string => String(n).padStart(2, "0");

/** The local calendar day of an epoch time, as "YYYY-MM-DD". */
export function dayKey(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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
