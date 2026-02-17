/**
 * Database model for books-admin-app (read-only API).
 * Same interface as database-viewer; uses app config for DB path.
 */

const sqlite3 = require('sqlite3').verbose();
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
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Database connection failed:', err);
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
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
    const safeSortBy = typeof sortBy === 'string' && allowedColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = (typeof sortOrder === 'string' && /^(ASC|DESC)$/i.test(sortOrder)) ? sortOrder.toUpperCase() : 'DESC';

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
    if (type) {
      if (type === 'audiobook') {
        whereConditions.push('(main_audio_url IS NOT NULL AND main_audio_url != "") OR (duration IS NOT NULL AND duration != "")');
      } else if (type === 'ebook') {
        whereConditions.push('(main_audio_url IS NULL OR main_audio_url = "") AND (duration IS NULL OR duration = "")');
      }
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
      chapter_urls: book.chapter_urls ? JSON.parse(book.chapter_urls) : []
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
      return {
        ...book,
        duration_formatted: this.formatDuration(book.duration),
        created_at: new Date(book.created_at).toISOString(),
        updated_at: new Date(book.updated_at).toISOString(),
        chapter_urls: book.chapter_urls ? JSON.parse(book.chapter_urls) : []
      };
    }
    return null;
  }

  async searchBooks(query, options = {}) {
    const { page = 1, limit = config.pagination.defaultLimit } = options;
    const offset = (page - 1) * limit;

    const searchSql = `
      SELECT * FROM books
      WHERE title LIKE ? OR author LIKE ? OR description LIKE ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const searchParams = [`%${query}%`, `%${query}%`, `%${query}%`, limit, offset];
    const books = await this.all(searchSql, searchParams);

    const countSql = `
      SELECT COUNT(*) as total FROM books
      WHERE title LIKE ? OR author LIKE ? OR description LIKE ?
    `;
    const countResult = await this.get(countSql, [`%${query}%`, `%${query}%`, `%${query}%`]);
    const total = countResult.total;

    const formattedBooks = books.map(book => ({
      ...book,
      duration_formatted: this.formatDuration(book.duration),
      created_at: new Date(book.created_at).toISOString(),
      updated_at: new Date(book.updated_at).toISOString()
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

  formatDuration(seconds) {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
}

module.exports = Database;
