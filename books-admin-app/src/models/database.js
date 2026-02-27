/**
 * Database model for books-admin-app (read-only API).
 * Same interface as database-viewer; uses app config for DB path.
 * Uses better-sqlite3 (synchronous API wrapped in promises for compatibility).
 */

const DatabaseNative = require('better-sqlite3');
const path = require('path');

// Config is loaded at runtime (server passes or we require here)
function getConfig() {
  try {
    return require('../config/config');
  } catch (e) {
    return { database: { path: path.join(__dirname, '../../../data/grqaser.db') }, pagination: { defaultLimit: 20 } };
  }
}

const config = getConfig();

class Database {
  constructor(customPath = null) {
    this.db = null;
    this.dbPath = customPath || config.database.path;
  }

  async connect() {
    try {
      // Open read-write so updates (PATCH) work; default is read-write, explicit for clarity.
      this.db = new DatabaseNative(this.dbPath, { readonly: false });
      await this.ensureCrawlerTables();
      await this.ensureBooksFilterColumns();
      await this.ensureSearchIndexes();
      return Promise.resolve();
    } catch (err) {
      console.error('❌ Database connection failed:', err);
      return Promise.reject(err);
    }
  }

  /**
   * Ensure url_queue and crawl_logs exist (CREATE TABLE IF NOT EXISTS).
   * Fixes 500s when crawler status/logs API is hit before the crawler has run.
   */
  async ensureCrawlerTables() {
    const urlQueueSql = `
      CREATE TABLE IF NOT EXISTS url_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        url_type TEXT NOT NULL,
        priority INTEGER DEFAULT 1,
        status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        error_message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `.trim();
    const crawlLogsSql = `
      CREATE TABLE IF NOT EXISTS crawl_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        book_id INTEGER,
        url TEXT,
        error_details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `.trim();
    await this.run(urlQueueSql);
    await this.run(crawlLogsSql);
    return Promise.resolve();
  }

  /** Ensure books has type column for list filter. Idempotent. */
  async ensureBooksFilterColumns() {
    const tableInfo = await this.all("SELECT name FROM pragma_table_info('books')");
    const names = (tableInfo || []).map((r) => r.name);
    if (!names.includes('type')) {
      await this.run("ALTER TABLE books ADD COLUMN type VARCHAR(50) DEFAULT 'audiobook'");
    }
  }

  /** Ensure indexes used by advanced search exist. Idempotent. */
  async ensureSearchIndexes() {
    await this.run('CREATE INDEX IF NOT EXISTS idx_books_author_id ON books(author_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_books_category_id ON books(category_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_books_duration ON books(duration)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_books_author_category ON books(author_id, category_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_books_description ON books(description)');
  }

  async close() {
    if (this.db) {
      try {
        this.db.close();
      } catch (err) {
        return Promise.reject(err);
      }
      this.db = null;
    }
    return Promise.resolve();
  }

  async run(sql, params = []) {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return Promise.resolve({ id: result.lastInsertRowid, changes: result.changes });
  }

  async get(sql, params = []) {
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params);
    return Promise.resolve(row);
  }

  async all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);
    return Promise.resolve(rows);
  }

  static get ALLOWED_SORT_COLUMNS() {
    return ['id', 'title', 'author', 'created_at', 'updated_at', 'category', 'crawl_status', 'duration'];
  }

  async getBooks(options = {}) {
    const {
      page = 1,
      limit = config.pagination.defaultLimit,
      author = null,
      category = null,
      crawlStatus = null,
      type = null,
      durationMin = null,
      durationMax = null,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    const allowedColumns = Database.ALLOWED_SORT_COLUMNS;
    const sortByStr = typeof sortBy === 'string' ? sortBy.trim() : '';
    const safeSortBy = sortByStr && allowedColumns.includes(sortByStr) ? sortByStr : 'created_at';
    const sortOrderStr = typeof sortOrder === 'string' ? sortOrder.trim() : '';
    const safeSortOrder = /^(ASC|DESC)$/i.test(sortOrderStr) ? sortOrderStr.toUpperCase() : 'DESC';

    const whereConditions = [];
    const params = [];

    if (author) {
      whereConditions.push('author LIKE ?');
      params.push(`%${author}%`);
    }
    if (category) {
      whereConditions.push('category = ?');
      params.push(category);
    }
    if (crawlStatus) {
      whereConditions.push('crawl_status = ?');
      params.push(crawlStatus);
    }
    if (type && (type === 'audiobook' || type === 'ebook')) {
      whereConditions.push('"type" = ?');
      params.push(type);
    }
    if (durationMin !== null) {
      whereConditions.push('duration >= ?');
      params.push(durationMin);
    }
    if (durationMax !== null) {
      whereConditions.push('duration <= ?');
      params.push(durationMax);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countSql = `SELECT COUNT(*) as total FROM books ${whereClause}`;
    const countResult = await this.get(countSql, params);
    const total = countResult.total;

    const booksSql = `
      SELECT * FROM books ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;
    const books = await this.all(booksSql, [...params, limit, offset]);

    const formattedBooks = books.map(book => ({
      ...book,
      duration_formatted: this.formatDuration(book.duration),
      created_at: new Date(book.created_at).toISOString(),
      updated_at: new Date(book.updated_at).toISOString(),
      chapter_urls: this.parseChapterUrls(book.chapter_urls)
    }));

    return {
      books: formattedBooks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        has_next: page < Math.ceil(total / limit),
        has_prev: page > 1
      }
    };
  }

  async getBookById(id) {
    const book = await this.get('SELECT * FROM books WHERE id = ?', [id]);
    if (book) {
      const out = {
        ...book,
        duration_formatted: this.formatDuration(book.duration),
        created_at: new Date(book.created_at).toISOString(),
        updated_at: new Date(book.updated_at).toISOString(),
        chapter_urls: this.parseChapterUrls(book.chapter_urls)
      };
      if (book.last_edited_at) out.last_edited_at = new Date(book.last_edited_at).toISOString();
      return out;
    }
    return null;
  }

  async searchBooks(queryOrOptions, maybeOptions = {}) {
    const isLegacyCall = typeof queryOrOptions === 'string';
    const input = isLegacyCall ? { ...(maybeOptions || {}), text: queryOrOptions } : (queryOrOptions || {});
    const {
      authorIds = [],
      categoryIds = [],
      durationRange = null,
      text = null,
      page = 1,
      limit = config.pagination.defaultLimit
    } = input;

    const whereConditions = [];
    const params = [];

    if (Array.isArray(authorIds) && authorIds.length > 0) {
      whereConditions.push(`books.author_id IN (${authorIds.map(() => '?').join(', ')})`);
      params.push(...authorIds);
    }

    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      whereConditions.push(`books.category_id IN (${categoryIds.map(() => '?').join(', ')})`);
      params.push(...categoryIds);
    }

    const durationSql = this.buildDurationRangeCondition(durationRange);
    if (durationSql) {
      whereConditions.push(durationSql);
    }

    if (typeof text === 'string' && text.trim()) {
      whereConditions.push('(books.title LIKE ? OR books.description LIKE ? OR COALESCE(authors.name, books.author) LIKE ?)');
      const pattern = `%${text.trim()}%`;
      params.push(pattern, pattern, pattern);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const safeLimit = Math.max(1, Number(limit) || config.pagination.defaultLimit);
    const safePage = Math.max(1, Number(page) || 1);
    const offset = (safePage - 1) * safeLimit;

    const baseFromClause = `
      FROM books
      LEFT JOIN authors ON authors.id = books.author_id
      LEFT JOIN book_categories ON book_categories.id = books.category_id
    `;

    const searchSql = `
      SELECT books.*,
             COALESCE(authors.name, books.author) AS author_name,
             COALESCE(book_categories.name, books.category) AS category_name
      ${baseFromClause}
      ${whereClause}
      ORDER BY books.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const books = await this.all(searchSql, [...params, safeLimit, offset]);

    const countSql = `
      SELECT COUNT(*) as total
      ${baseFromClause}
      ${whereClause}
    `;
    const countResult = await this.get(countSql, params);
    const total = countResult.total;

    const formattedBooks = books.map(book => ({
      ...book,
      author: book.author_name || book.author,
      category: book.category_name || book.category,
      duration_formatted: this.formatDuration(book.duration),
      created_at: new Date(book.created_at).toISOString(),
      updated_at: new Date(book.updated_at).toISOString(),
      chapter_urls: this.parseChapterUrls(book.chapter_urls)
    }));

    return {
      books: formattedBooks,
      total,
      page: safePage,
      limit: safeLimit,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
        has_next: safePage < Math.ceil(total / safeLimit),
        has_prev: safePage > 1
      }
    };
  }

  buildDurationRangeCondition(durationRange) {
    const normalized = typeof durationRange === 'string'
      ? durationRange.trim().replace(/\s+/g, '')
      : '';
    switch (normalized) {
      case '<30':
        return 'books.duration < 30';
      case '30-60':
        return 'books.duration >= 30 AND books.duration < 60';
      case '60-120':
        return 'books.duration >= 60 AND books.duration < 120';
      case '120-300':
        return 'books.duration >= 120 AND books.duration < 300';
      case '300':
      case '300+':
        return 'books.duration >= 300';
      default:
        return '';
    }
  }

  async listAuthorsWithBookCount() {
    return this.all(`
      SELECT
        a.id,
        a.name,
        COUNT(b.id) AS book_count
      FROM authors a
      LEFT JOIN books b ON b.author_id = a.id
      GROUP BY a.id, a.name
      ORDER BY a.name ASC
    `);
  }

  async listCategoriesWithBookCount() {
    return this.all(`
      SELECT
        c.id,
        c.name,
        COUNT(b.id) AS book_count
      FROM book_categories c
      LEFT JOIN books b ON b.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY c.name ASC
    `);
  }

  async getCrawlStats() {
    const stats = {};
    const totalBooks = await this.get('SELECT COUNT(*) as count FROM books');
    stats.totalBooks = totalBooks.count;

    const booksByStatus = await this.all(`
      SELECT crawl_status, COUNT(*) as count FROM books GROUP BY crawl_status
    `);
    stats.booksByStatus = booksByStatus;

    const booksByCategory = await this.all(`
      SELECT category, COUNT(*) as count FROM books GROUP BY category
    `);
    stats.booksByCategory = booksByCategory;

    const booksByLanguage = await this.all(`
      SELECT language, COUNT(*) as count FROM books GROUP BY language
    `);
    stats.booksByLanguage = booksByLanguage;

    const durationStats = await this.get(`
      SELECT AVG(duration) as avg_duration, MIN(duration) as min_duration,
             MAX(duration) as max_duration, SUM(duration) as total_duration
      FROM books WHERE duration IS NOT NULL
    `);
    stats.duration = {
      average: Math.round(durationStats.avg_duration || 0),
      min: durationStats.min_duration || 0,
      max: durationStats.max_duration || 0,
      total: durationStats.total_duration || 0,
      total_hours: Math.round((durationStats.total_duration || 0) / 3600)
    };

    const recentActivity = await this.all(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM books WHERE created_at > datetime('now', '-7 days')
      GROUP BY DATE(created_at) ORDER BY date DESC
    `);
    stats.recentActivity = recentActivity;

    return stats;
  }

  async getUrlQueueStatus() {
    const urls = await this.all(`
      SELECT * FROM url_queue ORDER BY priority DESC, created_at ASC
    `);
    const summary = await this.all(`
      SELECT status, COUNT(*) as count FROM url_queue GROUP BY status
    `);
    return {
      urls,
      summary: summary.reduce((acc, item) => {
        acc[item.status] = item.count;
        return acc;
      }, {})
    };
  }

  async getCrawlLogs(options = {}) {
    const { page = 1, limit = config.pagination.defaultLimit, level = null, bookId = null } = options;
    const offset = (page - 1) * limit;
    const whereConditions = [];
    const params = [];
    if (level) {
      whereConditions.push('level = ?');
      params.push(level);
    }
    if (bookId) {
      whereConditions.push('book_id = ?');
      params.push(bookId);
    }
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const logsSql = `
      SELECT * FROM crawl_logs ${whereClause}
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `;
    const logs = await this.all(logsSql, [...params, limit, offset]);
    const countSql = `SELECT COUNT(*) as total FROM crawl_logs ${whereClause}`;
    const countResult = await this.get(countSql, params);
    const total = countResult.total;

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        has_next: page < Math.ceil(total / limit),
        has_prev: page > 1
      }
    };
  }

  async getAuthorsStats() {
    const authors = await this.all(`
      SELECT author, COUNT(*) as book_count, AVG(duration) as avg_duration, SUM(duration) as total_duration
      FROM books WHERE author IS NOT NULL AND author != 'Unknown Author'
      GROUP BY author ORDER BY book_count DESC
    `);
    return authors.map(author => ({
      ...author,
      avg_duration: Math.round(author.avg_duration || 0),
      total_duration: author.total_duration || 0
    }));
  }

  /**
   * Parse chapter_urls from DB (JSON string). Returns [] for null, empty string, or invalid JSON.
   */
  parseChapterUrls(value) {
    if (value == null || (typeof value === 'string' && value.trim() === '')) return [];
    if (typeof value !== 'string') return Array.isArray(value) ? value : [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  formatDuration(seconds) {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  /** Ensure last_edited_at column exists (Epic 6 / Story 6.4). Idempotent. */
  async ensureLastEditedAtColumn() {
    const row = await this.get("SELECT 1 FROM pragma_table_info('books') WHERE name = 'last_edited_at'");
    if (row) return;
    await this.run('ALTER TABLE books ADD COLUMN last_edited_at TIMESTAMP');
  }

  /**
   * Update a book by id (in-place UPDATE). Sets updated_at and last_edited_at.
   * Validates: non-empty title; URLs http/https; duration >= 0; rating 0-5; language length <= 10.
   * @param {number} id - Book id
   * @param {object} fields - Editable fields (title, author, description, duration, etc.)
   * @returns {object} Updated book or throws with message
   */
  async updateBook(id, fields) {
    const allowed = [
      'title', 'author', 'description', 'duration', 'duration_formatted', 'type', 'language',
      'category', 'rating', 'rating_count', 'cover_image_url', 'main_audio_url', 'download_url',
      'file_size', 'published_at', 'has_chapters', 'chapter_count', 'chapter_urls', 'crawl_status', 'is_active'
    ];
    const errors = [];
    if (fields.title !== undefined) {
      if (typeof fields.title !== 'string' || fields.title.trim() === '') errors.push('title must be non-empty');
    }
    if (fields.duration !== undefined) {
      const d = fields.duration;
      if (d !== null && (typeof d !== 'number' || Number.isNaN(d) || d < 0)) errors.push('duration must be non-negative number');
    }
    if (fields.rating !== undefined && fields.rating !== null) {
      const r = Number(fields.rating);
      if (Number.isNaN(r) || r < 0 || r > 5) errors.push('rating must be between 0 and 5');
    }
    if (fields.language !== undefined && fields.language !== null) {
      if (String(fields.language).length > 10) errors.push('language max length 10');
    }
    const urlFields = ['main_audio_url', 'download_url', 'cover_image_url'];
    for (const key of urlFields) {
      if (fields[key] !== undefined && fields[key] !== null && String(fields[key]).trim() !== '') {
        const u = String(fields[key]).trim();
        try {
          const parsed = new URL(u);
          if (!['http:', 'https:'].includes(parsed.protocol)) errors.push(`${key} must be http or https`);
        } catch {
          errors.push(`${key} must be a valid URL`);
        }
      }
    }
    if (errors.length > 0) throw new Error(errors.join('; '));

    await this.ensureLastEditedAtColumn();

    const setParts = [];
    const params = [];
    for (const key of allowed) {
      if (fields[key] === undefined) continue;
      setParts.push(`${key} = ?`);
      if (key === 'chapter_urls' && (Array.isArray(fields[key]) || typeof fields[key] === 'object')) {
        params.push(JSON.stringify(fields[key]));
      } else if (key === 'has_chapters') {
        params.push(fields[key] ? 1 : 0);
      } else {
        params.push(fields[key] === null || fields[key] === '' ? null : fields[key]);
      }
    }
    if (setParts.length === 0) throw new Error('No editable fields provided');
    setParts.push("updated_at = CURRENT_TIMESTAMP");
    setParts.push("last_edited_at = CURRENT_TIMESTAMP");
    params.push(id);
    const sql = `UPDATE books SET ${setParts.join(', ')} WHERE id = ?`;
    const result = await this.run(sql, params);
    if (result.changes === 0) return null;
    return this.getBookById(id);
  }
}

module.exports = Database;
