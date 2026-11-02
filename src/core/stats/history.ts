import type { SessionRecord } from "../engine/record";
import type { Layout } from "../layouts/layout";

/** Sessions shown in the history charts: enough for a trend, few enough to read. */
export const HISTORY_LIMIT = 30;

/** Newest sessions of one layout, oldest first. */
export function recentSessions(
  records: readonly SessionRecord[],
  layout: Layout["id"],
  limit = HISTORY_LIMIT,
): SessionRecord[] {
  return records
    .filter((r) => r.layout === layout)
    .sort((a, b) => a.at - b.at)
    .slice(-limit);
}

const OVERVIEW_WINDOW = 10;

const mean = (values: readonly number[]): number =>
  values.reduce((sum, v) => sum + v, 0) / values.length;

export interface Overview {
  /** Practice time on every layout: time belongs to the learner, not the layout. */
  totalMs: number;
  /** Means over the newest sessions of the layout; undefined with none. */
  recent?: {
    sessions: number;
    wpm: number;
    accuracy: number;
    /** Against the sessions before those; undefined until a full earlier window exists. */
    change?: { wpm: number; accuracy: number };
  };
}

/** The headline figures of the Stats view. */
export function overview(
  records: readonly SessionRecord[],
  layout: Layout["id"],
): Overview {
  const totalMs = records.reduce((sum, r) => sum + r.durationMs, 0);
  const all = recentSessions(records, layout, OVERVIEW_WINDOW * 2);
  const newest = all.slice(-OVERVIEW_WINDOW);
  if (newest.length === 0) return { totalMs };
  const wpm = mean(newest.map((r) => r.wpm));
  const accuracy = mean(newest.map((r) => r.accuracy));
  const recent = { sessions: newest.length, wpm, accuracy };
  if (all.length < OVERVIEW_WINDOW * 2) return { totalMs, recent };
  const earlier = all.slice(0, OVERVIEW_WINDOW);
  return {
    totalMs,
    recent: {
      ...recent,
      change: {
        wpm: wpm - mean(earlier.map((r) => r.wpm)),
        accuracy: accuracy - mean(earlier.map((r) => r.accuracy)),
      },
    },
  };
}

/** Linear heat 0..1 relative to the worst key; keys at 0 are absent. */
export function heatScale(
  counts: ReadonlyMap<string, number>,
): Map<string, number> {
  const max = Math.max(0, ...counts.values());
  const heat = new Map<string, number>();
  if (max === 0) return heat;
  for (const [code, n] of counts) if (n > 0) heat.set(code, n / max);
  return heat;
}

/** Top of the y axis: the next 1, 2 or 5 times a power of ten at or above the max. */
export function niceMax(max: number): number {
  if (!(max > 0)) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 5, 10].find((m) => m * pow >= max) ?? 10;
  return step * pow;
}
