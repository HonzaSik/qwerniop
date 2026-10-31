import { describe, expect, it, vi } from "vitest";
import type { SessionRecord } from "../core/engine/record";
import { createWriteQueue, type Writer } from "./queue";

const rec = (at: number): SessionRecord => ({ at }) as unknown as SessionRecord;

function setup(fail = false) {
  const log: string[] = [];
  let failing = fail;
  const gate = (name: string) => {
    log.push(name);
    return failing ? Promise.reject(new Error("x")) : Promise.resolve();
  };
  const writer: Writer = {
    putSettings: (s) => gate(`settings:${JSON.stringify(s)}`),
    putProgress: (_, p) => gate(`progress:${JSON.stringify(p)}`),
    addSession: (r) => gate(`session:${r.at}`),
    putTopic: (name, h) => gate(`topic:${name}:${h.count}`),
  };
  const tasks: Array<() => void> = [];
  const queue = createWriteQueue(writer, (f) => tasks.push(f));
  vi.spyOn(console, "error").mockImplementation(() => {});
  return { queue, log, tasks, heal: () => (failing = false) };
}

describe("write queue", () => {
  it("writes nothing until flushed or scheduled", () => {
    const { queue, log } = setup();
    queue.saveSettings({ a: 1 } as never);
    expect(log).toEqual([]);
  });

  it("schedules one flush per burst", () => {
    const { queue, tasks } = setup();
    queue.addSession(rec(1));
    queue.addSession(rec(2));
    expect(tasks).toHaveLength(1);
  });

  it("coalesces settings and progress, appends sessions", async () => {
    const { queue, log } = setup();
    queue.saveSettings({ v: 1 } as never);
    queue.saveSettings({ v: 2 } as never);
    queue.saveProgress("en-us", { v: 1 } as never);
    queue.saveProgress("en-us", { v: 3 } as never);
    queue.addSession(rec(1));
    queue.addSession(rec(2));
    await queue.flush();
    expect(log.sort()).toEqual([
      'progress:{"v":3}',
      "session:1",
      "session:2",
      'settings:{"v":2}',
    ]);
  });

  it("keeps the latest history of each topic", async () => {
    const { queue, log } = setup();
    queue.saveTopic("a", { count: 1, passages: [] });
    queue.saveTopic("a", { count: 2, passages: [] });
    queue.saveTopic("b", { count: 5, passages: [] });
    await queue.flush();
    expect(log.sort()).toEqual(["topic:a:2", "topic:b:5"]);
  });

  it("keeps the latest progress of each layout", async () => {
    const { queue, log } = setup();
    queue.saveProgress("en-us", { v: 1 } as never);
    queue.saveProgress("cs-qwertz", { v: 2 } as never);
    await queue.flush();
    expect(log.sort()).toEqual(['progress:{"v":1}', 'progress:{"v":2}']);
  });

  it("keeps failed writes for the next flush without retrying alone", async () => {
    const { queue, log, tasks, heal } = setup(true);
    queue.saveSettings({ v: 1 } as never);
    queue.addSession(rec(1));
    tasks.shift()?.();
    await queue.flush();
    const attempts = log.length;
    expect(tasks).toHaveLength(0);
    heal();
    await queue.flush();
    expect(log.slice(attempts).sort()).toEqual([
      "session:1",
      'settings:{"v":1}',
    ]);
    await queue.flush();
    expect(log).toHaveLength(attempts + 2);
  });

  it("does not overwrite a newer value with a failed older one", async () => {
    const { queue, log, heal } = setup(true);
    queue.saveSettings({ v: 1 } as never);
    const first = queue.flush();
    await Promise.resolve();
    queue.saveSettings({ v: 2 } as never);
    await first;
    heal();
    await queue.flush();
    expect(log.at(-1)).toBe('settings:{"v":2}');
  });

  it("discard drops queued writes", async () => {
    const { queue, log } = setup();
    queue.saveSettings({ a: 1 } as never);
    queue.addSession(rec(1));
    queue.discard();
    await queue.flush();
    expect(log).toEqual([]);
  });
});
