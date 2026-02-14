/**
 * Database Model
 * Handles all database operations for the crawler
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config/crawler-config');
const { CREATE_BOOKS_TABLE_SQL } = require('../schema/books-table');
const { CREATE_CRAWL_LOGS_TABLE_SQL } = require('../schema/crawl-logs-table');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = config.dbPath;
  }

  /**
   * Initialize database connection
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
   * Create all necessary tables
   */
  async createTables() {
    const tables = [
      this.createBooksTable(),
      this.createUrlQueueTable(),
      this.createCrawlLogsTable()
    ];

    await Promise.all(tables);
    console.log('✅ All tables created successfully');
  }

  /**
   * Create books table (DDL from schema/books-table.js)
   */
  async createBooksTable() {
    await this.run(CREATE_BOOKS_TABLE_SQL);
    await this.migrateBooksTableAddDurationFormatted();
  }

  /**
   * Migration: add duration_formatted column if missing (existing DBs)
   */
  async migrateBooksTableAddDurationFormatted() {
    return new Promise((resolve) => {
      this.db.all('PRAGMA table_info(books)', (err, rows) => {
        if (err) {
          resolve();
          return;
        }
        const hasColumn = rows && rows.some(r => r.name === 'duration_formatted');
        if (!hasColumn) {
          this.db.run('ALTER TABLE books ADD COLUMN duration_formatted TEXT', (alterErr) => {
            if (!alterErr) console.log('✅ Added duration_formatted to books');
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Create URL queue table
   */
  async createUrlQueueTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS url_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url VARCHAR(500) NOT NULL,
        url_type VARCHAR(50) NOT NULL,
        priority INTEGER DEFAULT 1,
        status VARCHAR(20) DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return this.run(createTableSQL);
  }

  /**
   * Create crawl logs table (DDL from schema/crawl-logs-table.js)
   */
  async createCrawlLogsTable() {
    return this.run(CREATE_CRAWL_LOGS_TABLE_SQL);
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

  /**
   * Save a book to database
   */
  async saveBook(bookData) {
    const sql = `
      INSERT OR REPLACE INTO books (
        id, title, author, description, duration, duration_formatted, type, language, category,
        rating, rating_count, cover_image_url, main_audio_url, download_url,
        file_size, published_at, crawl_status, has_chapters, chapter_count,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const params = [
      bookData.id,
      bookData.title,
      bookData.author,
      bookData.description,
      bookData.duration,
      bookData.duration_formatted ?? null,
      bookData.type || 'audiobook',
      bookData.language || 'hy',
      bookData.category || 'Unknown',
      bookData.rating,
      bookData.rating_count,
      bookData.cover_image_url,
      bookData.main_audio_url,
      bookData.download_url,
      bookData.file_size,
      bookData.published_at,
      bookData.crawl_status || 'discovered',
      bookData.has_chapters || false,
      bookData.chapter_count || 0
    ];

    return this.run(sql, params);
  }

  /**
   * Get book by ID
   */
  async getBookById(id) {
    return this.get('SELECT * FROM books WHERE id = ?', [id]);
  }

  /**
   * Get all books with pagination
   */
  async getBooks(limit = 50, offset = 0) {
    return this.all('SELECT * FROM books ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
  }

  /**
   * Get books count
   */
  async getBooksCount() {
    const result = await this.get('SELECT COUNT(*) as count FROM books');
    return result.count;
  }

  /**
   * Get books by category (filtering for database-viewer / GrqaserApp)
   */
  async getBooksByCategory(category, limit = 50, offset = 0) {
    return this.all(
      'SELECT * FROM books WHERE category = ? ORDER BY title LIMIT ? OFFSET ?',
      [category, limit, offset]
    );
  }

  /**
   * Get books by author (filtering for database-viewer / GrqaserApp)
   */
  async getBooksByAuthor(author, limit = 50, offset = 0) {
    return this.all(
      'SELECT * FROM books WHERE author = ? ORDER BY title LIMIT ? OFFSET ?',
      [author, limit, offset]
    );
  }

  /**
   * Get category counts for stats (aggregates)
   */
  async getCategoryCounts() {
    return this.all(
      'SELECT category, COUNT(*) as count FROM books GROUP BY category ORDER BY count DESC'
    );
  }

  /**
   * Get author counts for stats (aggregates)
   */
  async getAuthorCounts() {
    return this.all(
      'SELECT author, COUNT(*) as count FROM books GROUP BY author ORDER BY count DESC'
    );
  }

  /**
   * Log crawl activity
   */
  async logCrawl(level, message, bookId = null, url = null, errorDetails = null) {
    const sql = `
      INSERT INTO crawl_logs (level, message, book_id, url, error_details)
      VALUES (?, ?, ?, ?, ?)
    `;

    return this.run(sql, [level, message, bookId, url, errorDetails]);
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
    
    // Recent logs
    const recentLogs = await this.all(`
      SELECT level, COUNT(*) as count 
      FROM crawl_logs 
      WHERE created_at > datetime('now', '-1 hour')
      GROUP BY level
    `);
    stats.recentLogs = recentLogs;
    
    return stats;
  }
}

module.exports = Database;
