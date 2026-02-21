/**
 * Repository for the app-metadata SQLite database (grqaser_app_meta.db).
 * Manages the managed_databases, downloaded_mp3s, and library_entries tables.
 */
import {openDatabase, DatabaseConnection} from './connection';
import {ManagedDatabase, DownloadedMp3, LibraryEntry} from '../types/book';

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

const CREATE_DOWNLOADED_MP3S_TABLE = `
  CREATE TABLE IF NOT EXISTS downloaded_mp3s (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    chapter_index INTEGER,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    downloaded_at TEXT,
    audio_url TEXT NOT NULL
  )
`;

const CREATE_LIBRARY_ENTRIES_TABLE = `
  CREATE TABLE IF NOT EXISTS library_entries (
    book_id TEXT PRIMARY KEY,
    added_at TEXT NOT NULL,
    last_opened_at TEXT NOT NULL
  )
`;

export async function initAppMetaDb(dbPath: string): Promise<void> {
  if (connection) {
    await connection.close();
  }
  connection = await openDatabase(dbPath);
  await connection.db.executeSql(CREATE_MANAGED_DATABASES_TABLE);
  await connection.db.executeSql(CREATE_DOWNLOADED_MP3S_TABLE);
  await connection.db.executeSql(CREATE_LIBRARY_ENTRIES_TABLE);
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

function rowToDownloadedMp3(row: Record<string, unknown>): DownloadedMp3 {
  return {
    id: row.id as string,
    bookId: row.book_id as string,
    chapterIndex:
      row.chapter_index != null ? (row.chapter_index as number) : undefined,
    filePath: row.file_path as string,
    fileSizeBytes: row.file_size_bytes as number,
    downloadedAt: (row.downloaded_at as string) ?? '',
    sourceUrl: row.audio_url as string,
  };
}

function rowsToDownloadedMp3Array(results: {
  rows: {length: number; item(i: number): Record<string, unknown>};
}): DownloadedMp3[] {
  const items: DownloadedMp3[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    items.push(rowToDownloadedMp3(results.rows.item(i)));
  }
  return items;
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

  async updateDatabaseFileSize(id: string, fileSizeBytes: number): Promise<void> {
    const {db} = assertConnected();
    await db.executeSql(
      'UPDATE managed_databases SET file_size_bytes = ? WHERE id = ?',
      [fileSizeBytes, id],
    );
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

  // --- downloaded_mp3s CRUD ---

  async insertDownloadedMp3(entry: DownloadedMp3): Promise<void> {
    const {db} = assertConnected();
    await db.executeSql(
      'INSERT OR REPLACE INTO downloaded_mp3s (id, book_id, chapter_index, file_path, file_size_bytes, downloaded_at, audio_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        entry.id,
        entry.bookId,
        entry.chapterIndex ?? null,
        entry.filePath,
        entry.fileSizeBytes,
        entry.downloadedAt,
        entry.sourceUrl,
      ],
    );
  },

  async getDownloadsByBookId(bookId: string): Promise<DownloadedMp3[]> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT * FROM downloaded_mp3s WHERE book_id = ? ORDER BY chapter_index ASC',
      [bookId],
    );
    return rowsToDownloadedMp3Array(results);
  },

  async getAllDownloads(): Promise<DownloadedMp3[]> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT * FROM downloaded_mp3s ORDER BY downloaded_at DESC',
    );
    return rowsToDownloadedMp3Array(results);
  },

  async deleteDownloadsByBookId(bookId: string): Promise<void> {
    const {db} = assertConnected();
    await db.executeSql('DELETE FROM downloaded_mp3s WHERE book_id = ?', [
      bookId,
    ]);
  },

  async deleteAllDownloadRecords(): Promise<void> {
    const {db} = assertConnected();
    await db.executeSql('DELETE FROM downloaded_mp3s');
  },

  async getTotalDownloadSize(): Promise<number> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT COALESCE(SUM(file_size_bytes), 0) as total FROM downloaded_mp3s',
    );
    return results.rows.item(0).total;
  },

  async getTotalDatabaseSize(): Promise<number> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT COALESCE(SUM(file_size_bytes), 0) as total FROM managed_databases',
    );
    return results.rows.item(0).total;
  },

  async getDownloadedBookIds(): Promise<string[]> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT DISTINCT book_id FROM downloaded_mp3s',
    );
    const ids: string[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      ids.push(results.rows.item(i).book_id as string);
    }
    return ids;
  },

  // --- library_entries CRUD ---

  async addToLibrary(bookId: string): Promise<void> {
    const {db} = assertConnected();
    const now = new Date().toISOString();
    await db.executeSql(
      `INSERT INTO library_entries (book_id, added_at, last_opened_at)
       VALUES (?, ?, ?)
       ON CONFLICT(book_id) DO UPDATE SET last_opened_at = excluded.last_opened_at`,
      [bookId, now, now],
    );
  },

  async removeFromLibrary(bookId: string): Promise<void> {
    const {db} = assertConnected();
    await db.executeSql('DELETE FROM library_entries WHERE book_id = ?', [
      bookId,
    ]);
  },

  async getLibraryEntries(): Promise<LibraryEntry[]> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT * FROM library_entries ORDER BY last_opened_at DESC',
    );
    const entries: LibraryEntry[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      entries.push({
        id: row.book_id as string,
        bookId: row.book_id as string,
        addedAt: row.added_at as string,
        lastOpenedAt: row.last_opened_at as string,
        source: 'auto',
      });
    }
    return entries;
  },

  async isInLibrary(bookId: string): Promise<boolean> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT 1 FROM library_entries WHERE book_id = ? LIMIT 1',
      [bookId],
    );
    return results.rows.length > 0;
  },
};
