import { describe, expect, test } from "vitest";
import raw from "../../data/words/en.txt?raw";
import { apply, createSession, type Session } from "../engine/engine";
import { accuracy, netWpm } from "../engine/results";
import { enUs } from "../layouts/en-us";
import {
  completeLesson,
  initialProgress,
  lessonTitle,
  type Progress,
} from "../lessons/lessons";
import { unlockedLetters } from "../lessons/letters";
import { defaultSettings } from "../settings/settings";
import { foldSession } from "../stats/chars";
import { generate } from "../text/generate";
import { type Rng, seededRng } from "../text/rng";
import { feedbackSentence, weakestKeys } from "./feedback";

const targets = defaultSettings().targets;
const words = raw.split("\n").filter(Boolean);

interface Hand {
  accuracy: number;
  ms: number;
  jitter: number;
}
type HandFor = (char: string) => Hand;

const strong: HandFor = () => ({ accuracy: 1, ms: 180, jitter: 40 });
const bad: HandFor = () => ({ accuracy: 0.85, ms: 450, jitter: 60 });

function typeText(text: string, hand: HandFor, rng: Rng): Session {
  const s = createSession({ text, errorMode: "continue" });
  let at = 1000;
  for (const { expected } of s.chars) {
    const h = hand(expected);
    at += h.ms + (rng() * 2 - 1) * h.jitter;
    apply(s, {
      kind: "char",
      char: rng() < h.accuracy ? expected : "#",
      at,
    });
  }
  return s;
}

interface Round {
  stage: number;
  progress: Progress;
  sentence: string;
  weakest: string[];
  unlocked: boolean;
}

/** One seeded rng drives both the text and the hand; each round mirrors App.svelte finish(). */
function simulate(
  handForSession: (session: number, rng: Rng) => HandFor,
  n: number,
  seed: number,
): Round[] {
  const rng = seededRng(seed);
  let p = initialProgress();
  const rounds: Round[] = [];
  for (let i = 0; i < n; i++) {
    const stage = p.letters;
    const text = generate({
      words,
      allowed: unlockedLetters("en-us", stage) ?? "",
      stats: p.stats,
      targets,
      length: 30,
      rng,
    });
    const s = typeText(text, handForSession(i, rng), rng);
    p = completeLesson(
      "en-us",
      { ...p, stats: foldSession(p.stats, s.log) },
      { track: "letters", stage },
      targets,
    );
    const weakest = weakestKeys(
      enUs,
      p.stats,
      s.log.map((k) => k.expected),
      targets,
      3,
    ).map((code) => code.replace("Key", ""));
    const unlocked = p.letters > stage;
    const sentence = feedbackSentence({
      wpm: netWpm(s),
      accuracy: accuracy(s),
      targets,
      weakest,
      unlocked: unlocked
        ? lessonTitle("en-us", { track: "letters", stage: p.letters })
        : undefined,
    });
    rounds.push({ stage, progress: p, sentence, weakest, unlocked });
  }
  return rounds;
}

const stagesOf = (rounds: Round[]) => rounds.map((r) => r.progress.letters);

function expectSteady(rounds: Round[]): void {
  let prev = 1;
  for (const r of rounds) {
    expect(r.progress.letters).toBeGreaterThanOrEqual(prev);
    expect(r.progress.letters - prev).toBeLessThanOrEqual(1);
    prev = r.progress.letters;
  }
}

const UNLOCK = /^(Both targets met|Lesson \d+ · .+ is unlocked\.)/;
const count = (text: string, c: string) => text.split(c).length - 1;

describe("simulated learners", () => {
  const strongRun = simulate(() => strong, 24, 1);

  test("strong learner climbs one lesson at a time", () => {
    expectSteady(strongRun);
    // Five sessions to reach 30 attempts per letter, then roughly one lesson per two sessions.
    expect(stagesOf(strongRun)[17]).toBeGreaterThanOrEqual(8);
    expect(strongRun.at(-1)?.progress.letters).toBeGreaterThanOrEqual(7);
    for (const r of strongRun) {
      expect(r.sentence).toMatch(UNLOCK);
      // The unlock sentence wins over every other rule.
      if (r.unlocked)
        expect(r.sentence).toMatch(/^Lesson \d+ · .+ is unlocked\.$/);
    }
    const { f } = strongRun.at(-1)?.progress.stats ?? {};
    expect(f?.accuracy).toBe(1);
    expect(f?.ms).toBeGreaterThan(150);
    expect(f?.ms).toBeLessThan(210);
  });

  test("Space is typed but never gates a lesson", () => {
    const { stats } = strongRun[0]?.progress ?? {};
    expect(stats?.[" "]).toBeDefined();
    expect(unlockedLetters("en-us", 14)).not.toContain(" ");
  });

  const weakHand: HandFor = (c) =>
    c === "k" ? { accuracy: 0.6, ms: 180, jitter: 40 } : strong(c);
  const weakRun = simulate(() => weakHand, 15, 1);

  test("learner weak on k unlocks lesson 2 but never lesson 3", () => {
    const stages = stagesOf(weakRun);
    expect(stages.at(-1)).toBe(2);
    expect(stages[5]).toBe(2);
    expect(weakRun.at(-1)?.progress.stats.k?.accuracy).toBeLessThan(0.95);
  });

  test("learner weak on k is pointed at K", () => {
    const after = weakRun.slice(6);
    for (const r of after) {
      expect(r.weakest[0]).toBe("K");
      expect(r.sentence).toMatch(/\bK\b/);
    }
    // Whether a session misses the accuracy target depends on how often k was drawn.
    expect(after.map((r) => r.sentence)).toContain(
      "Slow down and aim for accuracy, especially on K.",
    );
  });

  test("weak stats make k more frequent than strong stats do", () => {
    const passage = (stats: Progress["stats"]) =>
      generate({
        words,
        allowed: "fjdk",
        stats,
        targets,
        length: 200,
        rng: seededRng(7),
      });
    const weakK = count(passage(weakRun.at(-1)?.progress.stats ?? {}), "k");
    const strongK = count(passage(strongRun.at(-1)?.progress.stats ?? {}), "k");
    expect(weakK).toBeGreaterThan(1.5 * strongK);
  });

  test("inconsistent learner only progresses on good sessions", () => {
    const good: boolean[] = [];
    const rounds = simulate(
      (i, rng) => {
        good[i] = rng() < 0.5;
        return good[i] ? strong : bad;
      },
      30,
      1,
    );
    expectSteady(rounds);
    rounds.forEach((r, i) => {
      if (!good[i]) expect(r.unlocked).toBe(false);
    });
    const stage = rounds.at(-1)?.progress.letters ?? 0;
    expect(stage).toBeGreaterThanOrEqual(3);
    expect(stage).toBeLessThanOrEqual(
      simulate(() => strong, 30, 1).at(-1)?.progress.letters ?? 0,
    );
  });
});
