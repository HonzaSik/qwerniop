import type { Layout } from "../layouts/layout";
import { strokesFor } from "../layouts/strokes";
import type { CharStats } from "../stats/chars";
import type { Targets } from "./weakness";

// The moving average starts at the first sample, so one early miss would read as 100 %.
const MIN_ATTEMPTS = 10;

export interface MissRate {
  char: string;
  /** Share of recent first attempts that were wrong, from 0 to 1. */
  rate: number;
}

/** Up to n characters missed more often than the accuracy target allows, worst first. */
export function missRates(
  stats: CharStats,
  targets: Targets,
  n: number,
): MissRate[] {
  const allowed = 1 - targets.accuracy;
  return Object.entries(stats)
    .filter(([char, s]) => char.trim() !== "" && s.attempts >= MIN_ATTEMPTS)
    .map(([char, s]) => ({ char, rate: 1 - s.accuracy }))
    .filter((m) => m.rate > allowed)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, n);
}

/**
 * Share of first tries that went wrong per physical key, over all practice on the layout.
 * Shift and dead keys count too, since those characters need them. Keys never missed are absent.
 */
export function keyMissRates(
  layout: Layout,
  stats: CharStats,
): Map<string, number> {
  const tally = new Map<string, { attempts: number; missed: number }>();
  for (const [char, stat] of Object.entries(stats)) {
    for (const stroke of strokesFor(layout, char) ?? []) {
      for (const code of [stroke.code, stroke.shift]) {
        if (!code) continue;
        const t = tally.get(code) ?? { attempts: 0, missed: 0 };
        t.attempts += stat.attempts;
        t.missed += stat.attempts - stat.correct;
        tally.set(code, t);
      }
    }
  }
  const rates = new Map<string, number>();
  for (const [code, t] of tally) {
    if (t.attempts >= MIN_ATTEMPTS && t.missed > 0) {
      rates.set(code, t.missed / t.attempts);
    }
  }
  return rates;
}
