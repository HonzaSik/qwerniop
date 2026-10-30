import {
  migrations as appMigrations,
  type Migration,
  pendingMigrations,
} from "./migrations";

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Thin promise wrapper over one open connection. */
export class Database {
  constructor(private readonly db: IDBDatabase) {}

  get<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
    return request<T | undefined>(
      this.db.transaction(store).objectStore(store).get(key),
    );
  }

  getAll<T>(store: string): Promise<T[]> {
    return request<T[]>(this.db.transaction(store).objectStore(store).getAll());
  }

  put(store: string, value: unknown, key?: IDBValidKey): Promise<IDBValidKey> {
    return request(
      this.db
        .transaction(store, "readwrite")
        .objectStore(store)
        .put(value, key),
    );
  }

  add(store: string, value: unknown): Promise<IDBValidKey> {
    return request(
      this.db.transaction(store, "readwrite").objectStore(store).add(value),
    );
  }

  close(): void {
    this.db.close();
  }
}

/**
 * Opens the database, running pending migrations. Resolves null when storage is
 * unavailable (private mode, blocked, error) so the app can run memory-only.
 */
export function openDatabase(
  name = "tenfold",
  list: readonly Migration[] = appMigrations,
): Promise<Database | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let gaveUp = false;
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(name, list.length);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = (event) => {
      const tx = req.transaction;
      if (!tx) return;
      try {
        for (const m of pendingMigrations(list, event.oldVersion))
          m.up(req.result, tx);
      } catch (error) {
        console.error("Storage migration failed", error);
        tx.abort();
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      if (gaveUp) {
        db.close();
        return;
      }
      // Let another tab upgrade; this connection is dead afterwards.
      db.onversionchange = () => db.close();
      resolve(new Database(db));
    };
    req.onerror = () => resolve(null);
    // Another tab holds an older version open and hasn't closed; don't wait on it.
    req.onblocked = () => {
      gaveUp = true;
      resolve(null);
    };
  });
}
