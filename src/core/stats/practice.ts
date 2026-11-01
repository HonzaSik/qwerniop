import type { SessionRecord } from "../engine/record";

const pad = (n: number): string => String(n).padStart(2, "0");

/** The local calendar day of an epoch time, as "YYYY-MM-DD". */
export function dayKey(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Milliseconds practised per local day, over every layout: time belongs to the learner, not the layout. */
export function practiceByDay(
  records: readonly SessionRecord[],
): Map<string, number> {
  const days = new Map<string, number>();
  for (const r of records) {
    const key = dayKey(r.at);
    days.set(key, (days.get(key) ?? 0) + r.durationMs);
  }
  return days;
}

/**
 * Columns of day keys, oldest first, ending with the week that holds `today`.
 * The last column stops at today, so no future day is drawn.
 */
export function calendarDays(
  today: number,
  weeks: number,
  weekStart: 0 | 1,
): string[][] {
  const end = new Date(today);
  // Date arithmetic on the calendar fields, not milliseconds, so a DST day is still one day.
  const back = (end.getDay() - weekStart + 7) % 7;
  const first = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate() - back - (weeks - 1) * 7,
  );
  const last = dayKey(today);
  const columns: string[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: string[] = [];
    for (let d = 0; d < 7; d++) {
      const key = dayKey(
        new Date(
          first.getFullYear(),
          first.getMonth(),
          first.getDate() + w * 7 + d,
        ).getTime(),
      );
      column.push(key);
      if (key === last) return [...columns, column];
    }
    columns.push(column);
  }
  return columns;
}

const MINUTE = 60_000;

/** Fixed minute steps rather than quartiles, so a level means the same thing every week. */
export function practiceLevel(ms: number): 0 | 1 | 2 | 3 | 4 {
  if (ms <= 0) return 0;
  if (ms < 5 * MINUTE) return 1;
  if (ms < 15 * MINUTE) return 2;
  if (ms < 30 * MINUTE) return 3;
  return 4;
}
