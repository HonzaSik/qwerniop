import { expect, type TestContext, test } from "vitest";
import {
  apply,
  type CharState,
  createSession,
  type InputEvent,
  type SessionConfig,
} from "../../src/core/engine/engine";

// PERFORMANCE.md budget for one `apply` call.
const BUDGET_MS_PER_EVENT = 0.05;

const PROSE =
  "The old lighthouse stood at the far end of the bay, where the road gave up and the rocks began. " +
  "Every evening the keeper climbed the narrow stairs, trimmed the wick and watched the fishing boats " +
  "come home in a long, uneven line. Nobody in the village could remember a night when the light had " +
  "failed, although the winters there were cruel and the supply ship often arrived weeks too late. " +
  "When the first electric lamp was finally installed, the keeper stayed on anyway, because the tower " +
  "still needed someone who knew how the wind behaved before a storm. Children walked out along the " +
  "shore to ask him about shipwrecks, and he answered each question slowly, as if the answer had to be " +
  "fetched from a great distance. On quiet mornings he repaired nets for his neighbours and drank black " +
  "coffee on the steps, counting the gulls that settled on the harbour wall and waiting for the tide.";

const CODE = `export function groupByLesson(words: string[], lessons: Lesson[]) {
  const groups = new Map<string, string[]>();

  for (const lesson of lessons) {
    const allowed = new Set(lesson.characters);
    const matching = words.filter((word) => {
      for (const char of word) {
        if (!allowed.has(char)) {
          return false;
        }
      }
      return true;
    });

    if (matching.length === 0) {
      throw new Error("No words for lesson " + lesson.id);
    }
    groups.set(lesson.id, matching);
  }

  return groups;
}

export function pickPassage(groups: Map<string, string[]>, id: string, count: number) {
  const words = groups.get(id);
  if (words === undefined) {
    return "";
  }

  const picked: string[] = [];
  for (let index = 0; index < count; index++) {
    picked.push(words[index % words.length] ?? "");
  }
  return picked.join(" ");
}
`;

const BACKSPACE = "\b";

function wrongKey(expected: string): string {
  return expected === "x" ? "z" : "x";
}

// One slip in 20 keys, the error rate of a learner at 95 % accuracy.
function isSlip(index: number): boolean {
  return index % 20 === 10;
}

function toEvents(keys: readonly string[]): InputEvent[] {
  return keys.map((key, index) => {
    const at = (index + 1) * 100;
    return key === BACKSPACE
      ? { kind: "backspace", at }
      : { kind: "char", char: key, at };
  });
}

/**
 * Runs one case and prints its per-event time. One bench iteration applies every
 * event of a whole passage, so per-event ms = iteration mean ms / events, the
 * `mean` column divided by the count in the bench name. 1000 / (hz * events) is
 * close but 1-2 % lower, because `hz` averages the rate of each sample. The
 * session is created in `beforeEach`, outside the timed function, so creating
 * it is not part of the figure.
 */
async function measure(
  bench: TestContext["bench"],
  name: string,
  config: SessionConfig,
  keys: readonly string[],
  expectedStatuses: readonly CharState["status"][],
) {
  const events = toEvents(keys);
  // Vitest's module runner turns every use of an import into a getter call, which
  // would be timed with each event. A local binding keeps it out of the loop.
  const applyEvent = apply;

  // A script that stalls or overshoots would time no-ops and flatter the figure.
  const rehearsal = createSession(config);
  for (const event of events) apply(rehearsal, event);
  expect(rehearsal.finishedAt).toBe(events.at(-1)?.at);
  expect(new Set(rehearsal.chars.map((char) => char.status))).toEqual(
    new Set(expectedStatuses),
  );

  let session = createSession(config);
  let changed = 0;
  const result = await bench(
    `${name} (${events.length} events)`,
    {
      beforeEach() {
        session = createSession(config);
      },
    },
    () => {
      // Read the result as the UI does, so the engine cannot optimize it away.
      for (const event of events) changed += applyEvent(session, event).length;
    },
  ).run();
  expect(changed).toBeGreaterThan(0);

  const perEventMs = result.latency.mean / events.length;
  console.log(
    `${name}: ${perEventMs.toPrecision(3)} ms/event, budget ${BUDGET_MS_PER_EVENT} ms (${result.latency.samplesCount} samples)`,
  );
  expect(perEventMs).toBeLessThan(BUDGET_MS_PER_EVENT);
}

const proseKeys = Array.from(PROSE);

test("clean correct run", async ({ bench }) => {
  await measure(
    bench,
    "clean correct run",
    { text: PROSE, errorMode: "stop" },
    proseKeys,
    ["correct"],
  );
});

test("errors in stop mode", async ({ bench }) => {
  await measure(
    bench,
    "errors, stop mode",
    { text: PROSE, errorMode: "stop" },
    proseKeys.flatMap((key, index) =>
      isSlip(index) ? [wrongKey(key), key] : [key],
    ),
    ["correct", "corrected"],
  );
});

test("errors and Backspace in continue mode", async ({ bench }) => {
  await measure(
    bench,
    "errors and Backspace, continue mode",
    { text: PROSE, errorMode: "continue" },
    proseKeys.flatMap((key, index) =>
      isSlip(index) ? [wrongKey(key), BACKSPACE, key] : [key],
    ),
    ["correct", "corrected"],
  );
});

test("code passage with skipped indentation", async ({ bench }) => {
  await measure(
    bench,
    "code with newlines and indentation",
    { text: CODE, errorMode: "stop" },
    // The engine skips indentation, so the learner never types those keys.
    Array.from(CODE.replace(/\n[ \t]+/g, "\n")),
    ["correct", "skipped"],
  );
});
