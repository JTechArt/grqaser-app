/**
 * Database Model
 * Handles all database operations for the crawler
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config/crawler-config');

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
   * Create books table
   */
  async createBooksTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        author VARCHAR(200) DEFAULT 'Unknown Author',
        description TEXT,
        duration INTEGER,
        type VARCHAR(50) DEFAULT 'audiobook',
        language VARCHAR(10) DEFAULT 'hy',
        category VARCHAR(100) DEFAULT 'Unknown',
        rating DECIMAL(3,2),
        rating_count INTEGER,
        cover_image_url TEXT,
        main_audio_url TEXT,
        download_url TEXT,
        file_size INTEGER,
        published_at DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        crawl_status VARCHAR(50) DEFAULT 'discovered',
        has_chapters BOOLEAN DEFAULT 0,
        chapter_count INTEGER DEFAULT 0
      )
    `;

    return this.run(createTableSQL);
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
   * Create crawl logs table
   */
  async createCrawlLogsTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS crawl_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level VARCHAR(10) NOT NULL,
        message TEXT NOT NULL,
        book_id INTEGER,
        url TEXT,
        error_details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return this.run(createTableSQL);
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
        id, title, author, description, duration, type, language, category,
        rating, rating_count, cover_image_url, main_audio_url, download_url,
        file_size, published_at, crawl_status, has_chapters, chapter_count,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const params = [
      bookData.id,
      bookData.title,
      bookData.author,
      bookData.description,
      bookData.duration,
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
