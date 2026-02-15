/**
 * Database Model for Database Viewer
 */

const sqlite3 = require('sqlite3').verbose();
const config = require('../config/config');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = config.database.path;
  }

  /**
   * Connect to database
   */
  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Database connection failed:', err);
          reject(err);
          return;
        }
        console.log('✅ Database connected');
        resolve();
      });
    });
  }

  /**
   * Close database connection
   */
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('❌ Database close failed:', err);
            reject(err);
            return;
          }
          console.log('✅ Database connection closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Execute a query with parameters
   */
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * Get a single row
   */
  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  }

  /**
   * Get multiple rows
   */
  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  /** Allowed sort columns for getBooks (whitelist to prevent SQL injection) */
  static get ALLOWED_SORT_COLUMNS() {
    return ['id', 'title', 'author', 'created_at', 'updated_at', 'category', 'crawl_status', 'duration'];
  }

  /**
   * Get books with pagination and filtering
   */
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

    // Whitelist sort column and direction to prevent SQL injection (SEC-001)
    const allowedColumns = Database.ALLOWED_SORT_COLUMNS;
    const safeSortBy = typeof sortBy === 'string' && allowedColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = (typeof sortOrder === 'string' && /^(ASC|DESC)$/i.test(sortOrder)) ? sortOrder.toUpperCase() : 'DESC';

    // Build WHERE clause
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

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM books ${whereClause}`;
    const countResult = await this.get(countSql, params);
    const total = countResult.total;

    // Get books
    const booksSql = `
      SELECT * FROM books 
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;
    const books = await this.all(booksSql, [...params, limit, offset]);

    // Format books data
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

  /**
   * Get book by ID
   */
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

  /**
   * Search books
   */
  async searchBooks(query, options = {}) {
    const {
      page = 1,
      limit = config.pagination.defaultLimit
    } = options;

    const offset = (page - 1) * limit;

    const searchSql = `
      SELECT * FROM books 
      WHERE title LIKE ? OR author LIKE ? OR description LIKE ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const searchParams = [`%${query}%`, `%${query}%`, `%${query}%`, limit, offset];
    const books = await this.all(searchSql, searchParams);

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total FROM books 
      WHERE title LIKE ? OR author LIKE ? OR description LIKE ?
    `;
    const countResult = await this.get(countSql, [`%${query}%`, `%${query}%`, `%${query}%`]);
    const total = countResult.total;

    // Format books
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

  /**
   * Get crawl statistics
   */
  async getCrawlStats() {
    const stats = {};

    // Total books
    const totalBooks = await this.get('SELECT COUNT(*) as count FROM books');
    stats.totalBooks = totalBooks.count;

    // Books by status
    const booksByStatus = await this.all(`
      SELECT crawl_status, COUNT(*) as count 
      FROM books 
      GROUP BY crawl_status
    `);
    stats.booksByStatus = booksByStatus;

    // Books by category
    const booksByCategory = await this.all(`
      SELECT category, COUNT(*) as count 
      FROM books 
      GROUP BY category
    `);
    stats.booksByCategory = booksByCategory;

    // Books by language
    const booksByLanguage = await this.all(`
      SELECT language, COUNT(*) as count 
      FROM books 
      GROUP BY language
    `);
    stats.booksByLanguage = booksByLanguage;

    // Duration statistics
    const durationStats = await this.get(`
      SELECT 
        AVG(duration) as avg_duration,
        MIN(duration) as min_duration,
        MAX(duration) as max_duration,
        SUM(duration) as total_duration
      FROM books 
      WHERE duration IS NOT NULL
    `);
    stats.duration = {
      average: Math.round(durationStats.avg_duration || 0),
      min: durationStats.min_duration || 0,
      max: durationStats.max_duration || 0,
      total: durationStats.total_duration || 0,
      total_hours: Math.round((durationStats.total_duration || 0) / 3600)
    };

    // Recent activity
    const recentActivity = await this.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM books 
      WHERE created_at > datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    stats.recentActivity = recentActivity;

    return stats;
  }

  /**
   * Get URL queue status
   */
  async getUrlQueueStatus() {
    const urls = await this.all(`
      SELECT * FROM url_queue 
      ORDER BY priority DESC, created_at ASC
    `);

    const summary = await this.all(`
      SELECT status, COUNT(*) as count 
      FROM url_queue 
      GROUP BY status
    `);

    return {
      urls,
      summary: summary.reduce((acc, item) => {
        acc[item.status] = item.count;
        return acc;
      }, {})
    };
  }

  /**
   * Get crawl logs
   */
  async getCrawlLogs(options = {}) {
    const {
      page = 1,
      limit = config.pagination.defaultLimit,
      level = null,
      bookId = null
    } = options;

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

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Get logs
    const logsSql = `
      SELECT * FROM crawl_logs 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const logs = await this.all(logsSql, [...params, limit, offset]);

    // Get total count
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

  /**
   * Get authors statistics
   */
  async getAuthorsStats() {
    const authors = await this.all(`
      SELECT 
        author,
        COUNT(*) as book_count,
        AVG(duration) as avg_duration,
        SUM(duration) as total_duration
      FROM books 
      WHERE author IS NOT NULL AND author != 'Unknown Author'
      GROUP BY author
      ORDER BY book_count DESC
    `);

    return authors.map(author => ({
      ...author,
      avg_duration: Math.round(author.avg_duration || 0),
      total_duration: author.total_duration || 0
    }));
  }

  /**
   * Format duration in seconds to human readable format
   */
  formatDuration(seconds) {
    if (!seconds) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}

module.exports = Database;
