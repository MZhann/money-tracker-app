import * as SQLite from 'expo-sqlite';

// One generic key-value-per-collection table keeps sync simple: every row is
// {collection, id, data JSON, updatedAt, deleted, dirty}. Balances live inside
// account rows and are recomputed by the store, never trusted from sync.
export const db = SQLite.openDatabaseSync('flow.db');

export function initDb() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS rows (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      data TEXT NOT NULL,
      updatedAt INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,
      dirty INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (collection, id)
    );
    CREATE INDEX IF NOT EXISTS idx_rows_dirty ON rows (dirty);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
  `);
}

export type Row<T> = { id: string; data: T; updatedAt: number; deleted: boolean; dirty: boolean };

export function loadAll<T>(collection: string): T[] {
  const rows = db.getAllSync<{ data: string }>(
    'SELECT data FROM rows WHERE collection = ? AND deleted = 0', [collection]);
  return rows.map(r => JSON.parse(r.data));
}

export function upsert(collection: string, id: string, data: unknown, opts?: { clean?: boolean; updatedAt?: number; deleted?: boolean }) {
  db.runSync(
    `INSERT INTO rows (collection, id, data, updatedAt, deleted, dirty) VALUES (?,?,?,?,?,?)
     ON CONFLICT(collection, id) DO UPDATE SET data=excluded.data, updatedAt=excluded.updatedAt, deleted=excluded.deleted, dirty=excluded.dirty`,
    [collection, id, JSON.stringify(data), opts?.updatedAt ?? Date.now(), opts?.deleted ? 1 : 0, opts?.clean ? 0 : 1]
  );
}

export function softDelete(collection: string, id: string) {
  db.runSync('UPDATE rows SET deleted = 1, dirty = 1, updatedAt = ? WHERE collection = ? AND id = ?', [Date.now(), collection, id]);
}

export function dirtyRows(collection: string) {
  return db.getAllSync<{ id: string; data: string; updatedAt: number; deleted: number }>(
    'SELECT id, data, updatedAt, deleted FROM rows WHERE collection = ? AND dirty = 1', [collection]
  ).map(r => ({ id: r.id, data: JSON.parse(r.data), updatedAt: r.updatedAt, deleted: !!r.deleted }));
}

export function markClean(collection: string, ids: string[]) {
  for (const id of ids) db.runSync('UPDATE rows SET dirty = 0 WHERE collection = ? AND id = ?', [collection, id]);
}

/** Hard-deletes every row in every collection (meta is kept). Local-only reset — bypasses sync soft-deletes. */
export function wipeAll() {
  db.runSync('DELETE FROM rows');
}

export function getMeta(key: string): string | null {
  const r = db.getFirstSync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
  return r?.value ?? null;
}
export function setMeta(key: string, value: string) {
  db.runSync('INSERT INTO meta (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}
