import { describe, expect, it } from "vitest";
import { type Migration, migrations, pendingMigrations } from "./migrations";

const step = (version: number): Migration => ({ version, up: () => {} });

describe("pendingMigrations", () => {
  const list = [step(1), step(2), step(3)];

  it("runs everything for a new database", () => {
    expect(pendingMigrations(list, 0).map((m) => m.version)).toEqual([1, 2, 3]);
  });

  it("runs only newer steps, in order", () => {
    expect(pendingMigrations(list, 1).map((m) => m.version)).toEqual([2, 3]);
  });

  it("runs nothing when current", () => {
    expect(pendingMigrations(list, 3)).toEqual([]);
  });

  it("rejects gaps and misordering", () => {
    expect(() => pendingMigrations([step(1), step(3)], 0)).toThrow();
    expect(() => pendingMigrations([step(2), step(1)], 0)).toThrow();
  });

  it("ships a valid app list", () => {
    expect(pendingMigrations(migrations, 0)).toHaveLength(migrations.length);
  });
});
