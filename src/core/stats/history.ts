import type { SessionRecord } from "../engine/record";
import type { Layout } from "../layouts/layout";
import { strokesFor } from "../layouts/strokes";

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

/**
 * Wrong attempts per physical key, summed over all sessions of the layout.
 * Source is the session records' `errors`; milestone 7 can swap in per-character stats here.
 * Shift is credited too, since a shifted character needs it.
 */
export function keyErrors(
  layout: Layout,
  records: readonly SessionRecord[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of records) {
    if (r.layout !== layout.id) continue;
    for (const [char, n] of Object.entries(r.errors)) {
      for (const stroke of strokesFor(layout, char) ?? []) {
        for (const code of [stroke.code, stroke.shift]) {
          if (code) out.set(code, (out.get(code) ?? 0) + n);
        }
      }
    }
  }
  return out;
}

/** Linear heat 0..1 relative to the worst key; keys with no errors are absent. */
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
