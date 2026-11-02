import type { SessionRecord } from "../engine/record";
import type { Layout } from "../layouts/layout";

export type DailyScore = Pick<SessionRecord, "at" | "wpm" | "accuracy">;

export interface DailySummary {
  today?: DailyScore;
  best?: { wpm: number; date: string };
  /** Dates with a scored try. */
  days: number;
}

export interface DailyResult {
  date: string;
  /** The day's score, which is not this try's when `first` is false. */
  score: DailyScore;
  first: boolean;
}

// The first finished try of a date: by then the text is known, so later tries are practice.
function scoresByDate(
  records: readonly SessionRecord[],
  layout: Layout["id"],
): Map<string, DailyScore> {
  const scores = new Map<string, DailyScore>();
  for (const { daily, layout: of, at, wpm, accuracy } of records) {
    if (daily === undefined || of !== layout) continue;
    const held = scores.get(daily);
    if (!held || at < held.at) scores.set(daily, { at, wpm, accuracy });
  }
  return scores;
}

export function dailySummary(
  records: readonly SessionRecord[],
  layout: Layout["id"],
  date: string,
): DailySummary {
  const scores = scoresByDate(records, layout);
  const today = scores.get(date);
  let best: DailySummary["best"];
  for (const [day, { wpm }] of scores) {
    if (!best || wpm > best.wpm) best = { wpm, date: day };
  }
  return {
    ...(today ? { today } : {}),
    ...(best ? { best } : {}),
    days: scores.size,
  };
}

/** `records` must include `record`. */
export function dailyResult(
  records: readonly SessionRecord[],
  record: SessionRecord,
  date: string,
): DailyResult | undefined {
  const score = scoresByDate(records, record.layout).get(date);
  return score && { date, score, first: score.at === record.at };
}
