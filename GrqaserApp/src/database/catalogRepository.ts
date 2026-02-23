/**
 * Repository for reading catalog data (books) from the active local SQLite
 * database. All catalog reads go through this module — no direct SQL elsewhere.
 */
import {
  openDatabase,
  openBundledDatabase,
  DatabaseConnection,
  DEFAULT_CATALOG_DB,
} from './connection';
import {Book} from '../types/book';
import {ApiBook, mapApiBookToBook} from '../services/bookMapper';

let connection: DatabaseConnection | null = null;

/**
 * Initialize catalog DB from a specific file path (e.g. a downloaded DB).
 */
export async function initCatalogDb(dbPath: string): Promise<void> {
  if (connection) {
    await connection.close();
  }
  connection = await openDatabase(dbPath);
}

/**
 * Initialize catalog DB from the bundled default database in app assets.
 */
export async function initBundledCatalogDb(): Promise<void> {
  if (connection) {
    await connection.close();
  }
  connection = await openBundledDatabase(DEFAULT_CATALOG_DB);
}

export async function closeCatalogDb(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
  }
}

function assertConnected(): DatabaseConnection {
  if (!connection) {
    throw new Error(
      'Catalog database not initialized. Call initCatalogDb() first.',
    );
  }
  return connection;
}

function rowsToArray(results: {
  rows: {length: number; item(i: number): ApiBook};
}): ApiBook[] {
  const arr: ApiBook[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    arr.push(results.rows.item(i));
  }
  return arr;
}

const DEFAULT_PAGE_SIZE = 20;

export const catalogRepository = {
  async getAllBooks(): Promise<Book[]> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT * FROM books ORDER BY title ASC',
    );
    return rowsToArray(results).map(mapApiBookToBook);
  },

  /**
   * Get a page of books for lazy loading. Use this instead of getAllBooks
   * for initial load and featured lists to avoid loading the full catalog.
   */
  async getBooksPage(limit = DEFAULT_PAGE_SIZE, offset = 0): Promise<Book[]> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT * FROM books ORDER BY title ASC LIMIT ? OFFSET ?',
      [limit, offset],
    );
    return rowsToArray(results).map(mapApiBookToBook);
  },

  /**
   * Get books by IDs (e.g. for Library or Favorites). Skips missing IDs.
   */
  async getBooksByIds(ids: string[]): Promise<Book[]> {
    if (ids.length === 0) {
      return [];
    }
    const {db} = assertConnected();
    const placeholders = ids.map(() => '?').join(',');
    const [results] = await db.executeSql(
      `SELECT * FROM books WHERE id IN (${placeholders}) ORDER BY title ASC`,
      ids,
    );
    return rowsToArray(results).map(mapApiBookToBook);
  },

  async getBookById(id: string | number): Promise<Book | null> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT * FROM books WHERE id = ? LIMIT 1',
      [id],
    );
    if (results.rows.length === 0) {
      return null;
    }
    return mapApiBookToBook(results.rows.item(0));
  },

  /**
   * Search books by title, author, or description. Limited to avoid loading
   * thousands of rows with 2000+ book catalogs (performance: Story 10.5).
   */
  async searchBooks(query: string, limit = 100): Promise<Book[]> {
    const {db} = assertConnected();
    const like = `%${query}%`;
    const [results] = await db.executeSql(
      'SELECT * FROM books WHERE title LIKE ? OR author LIKE ? OR description LIKE ? ORDER BY title ASC LIMIT ?',
      [like, like, like, limit],
    );
    return rowsToArray(results).map(mapApiBookToBook);
  },

  async getBookCount(): Promise<number> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT COUNT(*) as count FROM books',
    );
    return results.rows.item(0).count;
  },

  /**
   * Get the download-ready audio URLs for a book.
   * Multi-chapter books: parses `chapter_urls` JSON column.
   * Single-file books: returns `[main_audio_url]`.
   */
  async getAudioUrls(
    bookId: string | number,
  ): Promise<{urls: string[]; hasChapters: boolean}> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT main_audio_url, chapter_urls, has_chapters FROM books WHERE id = ? LIMIT 1',
      [bookId],
    );
    if (results.rows.length === 0) {
      return {urls: [], hasChapters: false};
    }
    const row = results.rows.item(0);
    const hasChapters = row.has_chapters === 1 || row.has_chapters === true;
    if (hasChapters && row.chapter_urls) {
      try {
        const parsed = JSON.parse(row.chapter_urls as string) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return {urls: parsed, hasChapters: true};
        }
      } catch {
        // fall through to main_audio_url
      }
    }
    const mainUrl = row.main_audio_url as string | null;
    return {
      urls: mainUrl ? [mainUrl] : [],
      hasChapters: false,
    };
  },

  async getStats(): Promise<{
    totalBooks: number;
    audiobooks: number;
    ebooks: number;
  }> {
    const {db} = assertConnected();
    const [results] = await db.executeSql(
      'SELECT COUNT(*) as total, ' +
        "SUM(CASE WHEN type = 'audiobook' OR type IS NULL THEN 1 ELSE 0 END) as audiobooks, " +
        "SUM(CASE WHEN type = 'ebook' THEN 1 ELSE 0 END) as ebooks " +
        'FROM books',
    );
    const row = results.rows.item(0);
    return {
      totalBooks: row.total ?? 0,
      audiobooks: row.audiobooks ?? 0,
      ebooks: row.ebooks ?? 0,
    };
  },
};
