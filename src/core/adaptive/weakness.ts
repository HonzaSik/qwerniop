import type { CharStat } from "../stats/chars";

export interface Targets {
  accuracy: number; // 0 to 1
  wpm: number; // at five characters per word
}

const CONFIDENT = 30; // attempts before the stats are trusted fully

const gap = (observed: number, target: number): number =>
  observed > target ? 1 - target / observed : 0;

/** How much a character needs practice, from 0 (at both targets, with enough attempts) to 1 (unseen or far off). */
export function weakness(stat: CharStat | undefined, targets: Targets): number {
  if (!stat) return 1;
  const acc = gap(1 - stat.accuracy, 1 - targets.accuracy);
  const speed = stat.timed === 0 ? 1 : gap(stat.ms, 60000 / (targets.wpm * 5));
  const c = Math.min(1, stat.attempts / CONFIDENT);
  return (c * (acc + speed)) / 2 + (1 - c);
}
