/**
 * Create test SQLite DB with minimal schema for API tests.
 * Uses better-sqlite3 to avoid native sqlite3 bindings (same as app).
 * Epic 9: Updated to use full schema from books-table.js and Epic 9 tables
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { CREATE_BOOKS_TABLE_SQL } = require('../src/crawler/schema/books-table');
const { CREATE_AUTHORS_TABLE_SQL } = require('../src/crawler/schema/authors-table');
const { CREATE_BOOK_CATEGORIES_TABLE_SQL } = require('../src/crawler/schema/book-categories-table');

const MINIMAL_URL_QUEUE = `
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

const MINIMAL_CRAWL_LOGS = `
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

function runSql(db, sql) {
  db.exec(sql);
}

async function createTestDb(dbPath) {
  const db = new Database(dbPath);
  // Epic 9: Create authors and book_categories tables first (for foreign keys)
  runSql(db, CREATE_AUTHORS_TABLE_SQL);
  runSql(db, CREATE_BOOK_CATEGORIES_TABLE_SQL);
  runSql(db, CREATE_BOOKS_TABLE_SQL);
  runSql(db, MINIMAL_URL_QUEUE);
  runSql(db, MINIMAL_CRAWL_LOGS);
  db.close();
}

function getTestDbPath() {
  const dir = path.join(os.tmpdir(), 'grqaser-books-admin-app-test');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, `test-${Date.now()}.db`);
}

async function seedBooks(db) {
  const now = new Date().toISOString();
  const rows = [
    {
      id: 1,
      title: 'First Audiobook',
      author: 'Author Alpha',
      description: 'Description one',
      crawl_status: 'completed',
      category: 'Fiction',
      language: 'hy',
      duration: 3600,
      duration_formatted: '60ժ 0ր',
      main_audio_url: 'https://example.com/audio1.mp3',
      created_at: now,
      updated_at: now
    },
    {
      id: 2,
      title: 'Second Book',
      author: 'Author Beta',
      description: 'Description two',
      crawl_status: 'completed',
      category: 'Non-Fiction',
      language: 'hy',
      duration: 7200,
      duration_formatted: '120ժ 0ր',
      main_audio_url: 'https://example.com/audio2.mp3',
      created_at: now,
      updated_at: now
    },
    {
      id: 3,
      title: 'Third Title',
      author: 'Author Alpha',
      description: 'Another description',
      crawl_status: 'discovered',
      category: 'Fiction',
      language: 'en',
      duration: 1800,
      duration_formatted: '30ժ 0ր',
      main_audio_url: 'https://example.com/audio3.mp3',
      created_at: now,
      updated_at: now
    }
  ];
  for (const row of rows) {
    await db.run(
      `INSERT OR REPLACE INTO books (
        id, title, author, description, crawl_status, category, language,
        duration, duration_formatted, main_audio_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id, row.title, row.author, row.description, row.crawl_status,
        row.category, row.language, row.duration, row.duration_formatted,
        row.main_audio_url, row.created_at, row.updated_at
      ]
    );
  }
}

module.exports = { createTestDb, getTestDbPath, seedBooks };
