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
import {Book, AdvancedSearchFilters, CatalogFilterOption} from '../types/book';
import {ApiBook, mapApiBookToBook} from '../services/bookMapper';
import {buildArmenianSearchVariants} from '../utils/armenianTransliteration';

let connection: DatabaseConnection | null = null;
let relationSchemaSupported: boolean | null = null;
let cachedAuthorOptions: CatalogFilterOption[] | null = null;
let cachedCategoryOptions: CatalogFilterOption[] | null = null;
const legacyAuthorNamesById = new Map<number, string>();
const legacyCategoryNamesById = new Map<number, string>();
type LegacyCatalogEntry = {
  book: Book;
  authorName: string;
  categoryName: string;
  durationMinutes: number;
  normalizedText: string;
};
let legacyCatalogSnapshot: LegacyCatalogEntry[] | null = null;

function resetCatalogCaches() {
  relationSchemaSupported = null;
  cachedAuthorOptions = null;
  cachedCategoryOptions = null;
  legacyCatalogSnapshot = null;
  legacyAuthorNamesById.clear();
  legacyCategoryNamesById.clear();
}

/**
 * Initialize catalog DB from a specific file path (e.g. a downloaded DB).
 */
export async function initCatalogDb(dbPath: string): Promise<void> {
  if (connection) {
    await connection.close();
  }
  connection = await openDatabase(dbPath);
  resetCatalogCaches();
}

/**
 * Initialize catalog DB from the bundled default database in app assets.
 */
export async function initBundledCatalogDb(): Promise<void> {
  if (connection) {
    await connection.close();
  }
  connection = await openBundledDatabase(DEFAULT_CATALOG_DB);
  resetCatalogCaches();
}

export async function closeCatalogDb(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
    resetCatalogCaches();
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

async function loadLegacyCatalogSnapshot(): Promise<LegacyCatalogEntry[]> {
  if (legacyCatalogSnapshot) {
    return legacyCatalogSnapshot;
  }

  const {db} = assertConnected();
  const [results] = await db.executeSql(
    'SELECT * FROM books ORDER BY title ASC',
  );

  legacyCatalogSnapshot = rowsToArray(results).map(row => {
    const book = mapApiBookToBook(row);
    const authorName = String(row.author ?? '').trim();
    const categoryName = String(row.category ?? '').trim();
    const normalizedText = [
      row.title ?? '',
      row.description ?? '',
      authorName,
    ]
      .join(' ')
      .toLowerCase();

    return {
      book: {
        ...book,
        author: authorName || book.author,
        category: categoryName || book.category,
      },
      authorName,
      categoryName,
      durationMinutes: Number(row.duration ?? 0),
      normalizedText,
    };
  });

  return legacyCatalogSnapshot;
}

async function supportsRelationSchema(): Promise<boolean> {
  if (relationSchemaSupported != null) {
    return relationSchemaSupported;
  }

  const {db} = assertConnected();
  const [results] = await db.executeSql(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('authors', 'book_categories') ORDER BY name ASC",
  );

  const names = new Set<string>();
  for (let i = 0; i < results.rows.length; i++) {
    names.add(String(results.rows.item(i).name));
  }

  relationSchemaSupported =
    names.has('authors') && names.has('book_categories');
  return relationSchemaSupported;
}

function buildDurationRangeCondition(
  durationRange: AdvancedSearchFilters['durationRange'],
): string {
  switch (durationRange) {
    case '<30':
      return 'books.duration < 30';
    case '30-60':
      return 'books.duration >= 30 AND books.duration < 60';
    case '60-120':
      return 'books.duration >= 60 AND books.duration < 120';
    case '120-300':
      return 'books.duration >= 120 AND books.duration < 300';
    case '300+':
      return 'books.duration >= 300';
    default:
      return '';
  }
}

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
    const variants = buildArmenianSearchVariants(query);
    const likes = variants.map(variant => `%${variant}%`);
    const titleClauses = variants.map(() => 'title LIKE ?').join(' OR ');
    const authorClauses = variants.map(() => 'author LIKE ?').join(' OR ');
    const descriptionClauses = variants
      .map(() => 'description LIKE ?')
      .join(' OR ');
    const [results] = await db.executeSql(
      `SELECT * FROM books WHERE ${titleClauses} OR ${authorClauses} OR ${descriptionClauses} ORDER BY title ASC LIMIT ?`,
      [...likes, ...likes, ...likes, limit],
    );
    return rowsToArray(results).map(mapApiBookToBook);
  },

  async getAuthors(): Promise<CatalogFilterOption[]> {
    if (cachedAuthorOptions) {
      return cachedAuthorOptions;
    }

    const hasRelationSchema = await supportsRelationSchema();
    let options: CatalogFilterOption[];

    if (hasRelationSchema) {
      const {db} = assertConnected();
      const [results] = await db.executeSql(
        'SELECT authors.id, authors.name, COUNT(books.id) AS book_count ' +
          'FROM authors LEFT JOIN books ON books.author_id = authors.id ' +
          'GROUP BY authors.id, authors.name ORDER BY authors.name ASC',
      );
      options = rowsToArray(results).map(row => ({
        id: Number(row.id),
        name: String(row.name ?? ''),
        bookCount: Number(row.book_count ?? 0),
      }));
    } else {
      const snapshot = await loadLegacyCatalogSnapshot();
      const counts = new Map<string, number>();
      snapshot.forEach(entry => {
        if (entry.authorName) {
          counts.set(entry.authorName, (counts.get(entry.authorName) ?? 0) + 1);
        }
      });
      options = Array.from(counts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, bookCount], index) => {
          const id = index + 1;
          legacyAuthorNamesById.set(id, name);
          return {id, name, bookCount};
        });
    }

    cachedAuthorOptions = options;
    return options;
  },

  async getCategories(): Promise<CatalogFilterOption[]> {
    if (cachedCategoryOptions) {
      return cachedCategoryOptions;
    }

    const hasRelationSchema = await supportsRelationSchema();
    let options: CatalogFilterOption[];

    if (hasRelationSchema) {
      const {db} = assertConnected();
      const [results] = await db.executeSql(
        'SELECT book_categories.id, book_categories.name, COUNT(books.id) AS book_count ' +
          'FROM book_categories LEFT JOIN books ON books.category_id = book_categories.id ' +
          'GROUP BY book_categories.id, book_categories.name ORDER BY book_categories.name ASC',
      );
      options = rowsToArray(results).map(row => ({
        id: Number(row.id),
        name: String(row.name ?? ''),
        bookCount: Number(row.book_count ?? 0),
      }));
    } else {
      const snapshot = await loadLegacyCatalogSnapshot();
      const counts = new Map<string, number>();
      snapshot.forEach(entry => {
        if (entry.categoryName) {
          counts.set(
            entry.categoryName,
            (counts.get(entry.categoryName) ?? 0) + 1,
          );
        }
      });
      options = Array.from(counts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, bookCount], index) => {
          const id = index + 1;
          legacyCategoryNamesById.set(id, name);
          return {id, name, bookCount};
        });
    }

    cachedCategoryOptions = options;
    return options;
  },

  async advancedSearch(
    filters: AdvancedSearchFilters & {page?: number; limit?: number},
  ): Promise<{books: Book[]; total: number; page: number; limit: number}> {
    const hasRelationSchema = await supportsRelationSchema();
    const {
      authorIds = [],
      categoryIds = [],
      durationRange = null,
      text = '',
      page = 1,
      limit = 100,
    } = filters;
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);
    const offset = (safePage - 1) * safeLimit;

    if (!hasRelationSchema) {
      const snapshot = await loadLegacyCatalogSnapshot();
      const selectedAuthors = new Set(
        authorIds
          .map(id => legacyAuthorNamesById.get(id))
          .filter((name): name is string => Boolean(name)),
      );
      const selectedCategories = new Set(
        categoryIds
          .map(id => legacyCategoryNamesById.get(id))
          .filter((name): name is string => Boolean(name)),
      );
      const searchVariants = buildArmenianSearchVariants(text);

      const filtered = snapshot.filter(entry => {
        if (selectedAuthors.size > 0 && !selectedAuthors.has(entry.authorName)) {
          return false;
        }
        if (
          selectedCategories.size > 0 &&
          !selectedCategories.has(entry.categoryName)
        ) {
          return false;
        }

        switch (durationRange) {
          case '<30':
            if (!(entry.durationMinutes < 30)) {
              return false;
            }
            break;
          case '30-60':
            if (
              !(entry.durationMinutes >= 30 && entry.durationMinutes < 60)
            ) {
              return false;
            }
            break;
          case '60-120':
            if (
              !(entry.durationMinutes >= 60 && entry.durationMinutes < 120)
            ) {
              return false;
            }
            break;
          case '120-300':
            if (
              !(entry.durationMinutes >= 120 && entry.durationMinutes < 300)
            ) {
              return false;
            }
            break;
          case '300+':
            if (!(entry.durationMinutes >= 300)) {
              return false;
            }
            break;
        }

        if (
          searchVariants.length > 0 &&
          !searchVariants.some(variant =>
            entry.normalizedText.includes(variant),
          )
        ) {
          return false;
        }

        return true;
      });

      return {
        books: filtered.slice(offset, offset + safeLimit).map(entry => entry.book),
        total: filtered.length,
        page: safePage,
        limit: safeLimit,
      };
    }

    const {db} = assertConnected();

    const where: string[] = [];
    const params: (string | number)[] = [];

    if (authorIds.length > 0) {
      if (hasRelationSchema) {
        where.push(
          `books.author_id IN (${authorIds.map(() => '?').join(',')})`,
        );
        params.push(...authorIds);
      } else {
        const authorNames = authorIds
          .map(id => legacyAuthorNamesById.get(id))
          .filter((name): name is string => Boolean(name));
        if (authorNames.length > 0) {
          where.push(`TRIM(books.author) IN (${authorNames.map(() => '?').join(',')})`);
          params.push(...authorNames);
        }
      }
    }
    if (categoryIds.length > 0) {
      if (hasRelationSchema) {
        where.push(
          `books.category_id IN (${categoryIds.map(() => '?').join(',')})`,
        );
        params.push(...categoryIds);
      } else {
        const categoryNames = categoryIds
          .map(id => legacyCategoryNamesById.get(id))
          .filter((name): name is string => Boolean(name));
        if (categoryNames.length > 0) {
          where.push(
            `TRIM(books.category) IN (${categoryNames.map(() => '?').join(',')})`,
          );
          params.push(...categoryNames);
        }
      }
    }
    const durationCondition = buildDurationRangeCondition(durationRange);
    if (durationCondition) {
      where.push(durationCondition);
    }
    if (text.trim()) {
      const variants = buildArmenianSearchVariants(text);
      const textClauses = variants
        .map(() =>
          hasRelationSchema
            ? '(books.title LIKE ? OR books.description LIKE ? OR COALESCE(authors.name, books.author) LIKE ?)'
            : '(books.title LIKE ? OR books.description LIKE ? OR TRIM(books.author) LIKE ?)',
        )
        .join(' OR ');
      where.push(
        `(${textClauses})`,
      );
      variants.forEach(variant => {
        const pattern = `%${variant}%`;
        params.push(pattern, pattern, pattern);
      });
    }

    const whereClause = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
    const fromClause = hasRelationSchema
      ? ' FROM books LEFT JOIN authors ON authors.id = books.author_id LEFT JOIN book_categories ON book_categories.id = books.category_id'
      : ' FROM books';

    const [countResults] = await db.executeSql(
      `SELECT COUNT(*) as total${fromClause}${whereClause}`,
      params,
    );
    const total = Number(countResults.rows.item(0)?.total ?? 0);

    const [searchResults] = await db.executeSql(
      (hasRelationSchema
        ? 'SELECT books.*, ' +
          'COALESCE(authors.name, books.author) AS resolved_author, ' +
          'COALESCE(book_categories.name, books.category) AS resolved_category'
        : 'SELECT books.*, books.author AS resolved_author, books.category AS resolved_category') +
        `${fromClause}${whereClause} ORDER BY books.title ASC LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset],
    );

    const books = rowsToArray(searchResults).map(row =>
      mapApiBookToBook({
        ...row,
        author: String(
          (row as ApiBook & {resolved_author?: string}).resolved_author ??
            row.author ??
            '',
        ),
        category: String(
          (row as ApiBook & {resolved_category?: string}).resolved_category ??
            row.category ??
            '',
        ),
      }),
    );

    return {books, total, page: safePage, limit: safeLimit};
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
