import { describe, expect, it } from "vitest";
import {
  addPassage,
  emptyTopic,
  MAX_PASSAGES,
  parseTopicHistory,
  RECAP_EVERY,
  recapDue,
} from "./history";

describe("topic history", () => {
  it("caps stored passages but keeps counting", () => {
    let h = emptyTopic();
    for (let i = 0; i < MAX_PASSAGES + 2; i++) h = addPassage(h, `p${i}`);
    expect(h.count).toBe(MAX_PASSAGES + 2);
    expect(h.passages).toHaveLength(MAX_PASSAGES);
    expect(h.passages.at(-1)).toBe(`p${MAX_PASSAGES + 1}`);
  });

  it("asks for a recap every few passages, never at zero", () => {
    let h = emptyTopic();
    expect(recapDue(h)).toBe(false);
    const due: boolean[] = [];
    for (let i = 0; i < RECAP_EVERY * 2; i++) {
      h = addPassage(h, "x");
      due.push(recapDue(h));
    }
    expect(due).toEqual([false, false, true, false, false, true]);
  });

  it("repairs bad stored values", () => {
    expect(parseTopicHistory(undefined)).toEqual(emptyTopic());
    expect(parseTopicHistory({ count: "a", passages: [] })).toEqual(
      emptyTopic(),
    );
    expect(parseTopicHistory({ count: 1, passages: "x" })).toEqual(
      emptyTopic(),
    );
    expect(parseTopicHistory({ count: 0, passages: ["a", 3] })).toEqual({
      count: 1,
      passages: ["a"],
    });
  });
});
