import type { CharStat } from "../stats/chars";

const TARGET_ACCURACY = 0.95;
const TARGET_MS = 60000 / (35 * 5); // 35 WPM at five characters per word, about 343 ms
const CONFIDENT = 30; // attempts before the stats are trusted fully

const gap = (observed: number, target: number): number =>
  observed > target ? 1 - target / observed : 0;

/** How much a character needs practice, from 0 (at both targets) to 1 (unseen or far off). */
export function weakness(stat: CharStat | undefined): number {
  if (!stat) return 1;
  const acc = gap(1 - stat.accuracy, 1 - TARGET_ACCURACY);
  const speed = stat.timed === 0 ? 1 : gap(stat.ms, TARGET_MS);
  const c = Math.min(1, stat.attempts / CONFIDENT);
  return (c * (acc + speed)) / 2 + (1 - c);
}
