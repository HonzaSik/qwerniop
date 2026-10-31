import type { SessionRecord } from "../core/engine/record";
import type { Layout } from "../core/layouts/layout";
import type { Progress } from "../core/lessons/lessons";
import type { Settings } from "../core/settings/settings";
import type { TopicHistory } from "../core/topics/history";
import type { Store } from "./store";

export interface Writer {
  putSettings(settings: Settings): Promise<unknown>;
  putProgress(layout: Layout["id"], progress: Progress): Promise<unknown>;
  addSession(record: SessionRecord): Promise<unknown>;
  putTopic(topic: string, history: TopicHistory): Promise<unknown>;
}

export interface WriteQueue
  extends Pick<
    Store,
    "saveSettings" | "saveProgress" | "addSession" | "saveTopic"
  > {
  flush(): Promise<void>;
  /** Drops queued writes; a write already in flight finishes first when `flush` is awaited. */
  discard(): void;
}

/**
 * Holds writes in memory: settings and progress keep only the latest value,
 * sessions are appended. A failed write stays queued for the next flush; there
 * is no automatic retry, so a broken database cannot cause a retry loop.
 * Callers pass plain snapshots, which the queue keeps by reference.
 */
export function createWriteQueue(
  writer: Writer,
  schedule: (flush: () => void) => void,
): WriteQueue {
  let settings: Settings | null = null;
  let progress = new Map<Layout["id"], Progress>();
  let sessions: SessionRecord[] = [];
  let topics = new Map<string, TopicHistory>();
  let scheduled = false;
  let running: Promise<void> | null = null;

  const request = (): void => {
    if (scheduled) return;
    scheduled = true;
    schedule(() => {
      scheduled = false;
      void flush();
    });
  };

  const attempt = (write: Promise<unknown>): Promise<boolean> =>
    write.then(
      () => true,
      (error: unknown) => {
        console.error("Storage write failed", error);
        return false;
      },
    );

  async function drain(): Promise<void> {
    const s = settings;
    const p = progress;
    const batch = sessions;
    const tp = topics;
    settings = null;
    progress = new Map();
    sessions = [];
    topics = new Map();
    const [sOk, pOk, tOk, ...sessionOk] = await Promise.all([
      s ? attempt(writer.putSettings(s)) : true,
      Promise.all(
        [...p].map(
          async ([id, value]) =>
            [id, value, await attempt(writer.putProgress(id, value))] as const,
        ),
      ),
      Promise.all(
        [...tp].map(
          async ([name, value]) =>
            [name, value, await attempt(writer.putTopic(name, value))] as const,
        ),
      ),
      ...batch.map((r) => attempt(writer.addSession(r))),
    ]);
    // A value saved while the write was in flight is newer and wins.
    if (!sOk && s && !settings) settings = s;
    for (const [id, value, ok] of pOk) {
      if (!ok && !progress.has(id)) progress.set(id, value);
    }
    for (const [name, value, ok] of tOk) {
      if (!ok && !topics.has(name)) topics.set(name, value);
    }
    const failed = batch.filter((_, i) => !sessionOk[i]);
    sessions = [...failed, ...sessions];
  }

  function flush(): Promise<void> {
    // Chained so a flush requested mid-write runs after it, never alongside.
    running = (running ?? Promise.resolve()).then(drain);
    return running;
  }

  return {
    saveSettings(value) {
      settings = value;
      request();
    },
    saveProgress(layout, value) {
      progress.set(layout, value);
      request();
    },
    addSession(record) {
      sessions.push(record);
      request();
    },
    saveTopic(topic, value) {
      topics.set(topic, value);
      request();
    },
    flush,
    discard() {
      settings = null;
      progress = new Map();
      sessions = [];
      topics = new Map();
    },
  };
}
