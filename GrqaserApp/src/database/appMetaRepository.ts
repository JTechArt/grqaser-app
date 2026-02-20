/**
 * Repository for the app-metadata SQLite database (grqaser_app_meta.db).
 * Manages the managed_databases table. Other tables (downloaded_mp3s,
 * library_entries) are stubs for now — implemented in later stories.
 */
import {openDatabase, DatabaseConnection} from './connection';
import {ManagedDatabase} from '../types/book';

let connection: DatabaseConnection | null = null;

const CREATE_MANAGED_DATABASES_TABLE = `
  CREATE TABLE IF NOT EXISTS managed_databases (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    downloaded_at TEXT,
    is_active INTEGER DEFAULT 0
  )
`;

export async function initAppMetaDb(dbPath: string): Promise<void> {
  if (connection) {
    await connection.close();
  }
  connection = await openDatabase(dbPath);
  await connection.db.executeSql(CREATE_MANAGED_DATABASES_TABLE);
}

export async function closeAppMetaDb(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
  }
}

function assertConnected(): DatabaseConnection {
  if (!connection) {
    throw new Error(
      'App meta database not initialized. Call initAppMetaDb() first.',
    );
  }
  return connection;
}

function rowToManagedDatabase(row: Record<string, unknown>): ManagedDatabase {
  return {
    id: row.id as string,
    displayName: row.display_name as string,
    sourceUrl: row.source_url as string,
    filePath: row.file_path as string,
    fileSizeBytes: row.file_size_bytes as number,
    downloadedAt: (row.downloaded_at as string) ?? undefined,
    isActive: (row.is_active as number) === 1,
  };
}

export const appMetaRepository = {
  async listDatabases(): Promise<ManagedDatabase[]> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT * FROM managed_databases ORDER BY downloaded_at DESC',
    );
    const items: ManagedDatabase[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      items.push(rowToManagedDatabase(results.rows.item(i)));
    }
    return items;
  },

  async getActiveDatabase(): Promise<ManagedDatabase | null> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT * FROM managed_databases WHERE is_active = 1 LIMIT 1',
    );
    if (results.rows.length === 0) {
      return null;
    }
    return rowToManagedDatabase(results.rows.item(0));
  },

  async setActiveDatabase(id: string): Promise<void> {
    const {db} = assertConnected();
    await db.transaction(async tx => {
      await tx.executeSql(
        'UPDATE managed_databases SET is_active = 0 WHERE is_active = 1',
      );
      await tx.executeSql(
        'UPDATE managed_databases SET is_active = 1 WHERE id = ?',
        [id],
      );
    });
  },

  async addDatabase(entry: ManagedDatabase): Promise<void> {
    const {db} = assertConnected();
    await db.executeSql(
      'INSERT OR REPLACE INTO managed_databases (id, display_name, source_url, file_path, file_size_bytes, downloaded_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        entry.id,
        entry.displayName,
        entry.sourceUrl,
        entry.filePath,
        entry.fileSizeBytes,
        entry.downloadedAt ?? null,
        entry.isActive ? 1 : 0,
      ],
    );
  },

  async removeDatabase(id: string): Promise<void> {
    const {db} = assertConnected();
    await db.executeSql('DELETE FROM managed_databases WHERE id = ?', [id]);
  },

  async getDatabaseById(id: string): Promise<ManagedDatabase | null> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT * FROM managed_databases WHERE id = ? LIMIT 1',
      [id],
    );
    if (results.rows.length === 0) {
      return null;
    }
    return rowToManagedDatabase(results.rows.item(0));
  },
};
