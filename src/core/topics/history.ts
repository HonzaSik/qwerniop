export interface TopicHistory {
  /** Passages ever shown for the topic; `passages` only keeps the newest. */
  count: number;
  passages: string[];
}

/** Keeps a stored topic small: continuity needs the latest passage and a recap needs a few. */
export const MAX_PASSAGES = 6;
/** AI.md: "every few passages". */
export const RECAP_EVERY = 3;

export const emptyTopic = (): TopicHistory => ({ count: 0, passages: [] });

/** Stored values are unchecked; anything malformed reads as a fresh topic. */
export function parseTopicHistory(raw: unknown): TopicHistory {
  if (typeof raw !== "object" || raw === null) return emptyTopic();
  const { count, passages } = raw as Record<string, unknown>;
  if (
    typeof count !== "number" ||
    !Number.isInteger(count) ||
    count < 0 ||
    !Array.isArray(passages)
  ) {
    return emptyTopic();
  }
  const kept = passages
    .filter((p): p is string => typeof p === "string")
    .slice(-MAX_PASSAGES);
  return { count: Math.max(count, kept.length), passages: kept };
}

export function addPassage(history: TopicHistory, text: string): TopicHistory {
  return {
    count: history.count + 1,
    passages: [...history.passages, text].slice(-MAX_PASSAGES),
  };
}

export const recapDue = (history: TopicHistory): boolean =>
  history.count > 0 && history.count % RECAP_EVERY === 0;
