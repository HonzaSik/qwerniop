import { expect, test } from "vitest";
import { dailyText } from "./daily";

const words = Array.from({ length: 300 }, (_, i) =>
  `word${"abcdefghij"[i % 10]}${"klmnopqrst"[Math.floor(i / 10) % 10]}${"uvwxyz"[Math.floor(i / 100)]}`.replace(
    /\d/g,
    "",
  ),
);

test("the same date and layout give the same text", () => {
  expect(dailyText("2026-11-02", "en-us", words)).toBe(
    dailyText("2026-11-02", "en-us", words),
  );
});

test("another date or layout gives other text", () => {
  const text = dailyText("2026-11-02", "en-us", words);
  expect(dailyText("2026-11-03", "en-us", words)).not.toBe(text);
  expect(dailyText("2026-11-02", "cs-qwertz", words)).not.toBe(text);
});

test("it is thirty words from the list", () => {
  const picked = dailyText("2026-11-02", "en-us", words).split(" ");
  expect(picked).toHaveLength(30);
  for (const word of picked) expect(words).toContain(word);
});

// Friends compare scores, so a refactor must not quietly change a day's text between versions.
test("the text for a date does not change between versions", () => {
  expect(dailyText("2026-11-02", "en-us", words).slice(0, 40)).toBe(
    "wordfov wordbnu wordfsu wordhlv wordbpu ",
  );
});
