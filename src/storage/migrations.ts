export type Migration = {
  readonly version: number;
  readonly up: (db: IDBDatabase, tx: IDBTransaction) => void;
};

/** Migrations still to run for a database at `oldVersion`, in version order. */
export function pendingMigrations(
  migrations: readonly Migration[],
  oldVersion: number,
): Migration[] {
  migrations.forEach((m, i) => {
    if (m.version !== i + 1) {
      throw new Error(
        `Migration ${i + 1} has version ${m.version}; versions must be 1, 2, 3, ...`,
      );
    }
  });
  return migrations.filter((m) => m.version > oldVersion);
}

export const migrations: readonly Migration[] = [
  {
    version: 1,
    up(db) {
      db.createObjectStore("settings");
      db.createObjectStore("progress");
      db.createObjectStore("sessions", { autoIncrement: true });
    },
  },
  {
    version: 2,
    up(db) {
      db.createObjectStore("topics");
    },
  },
];
