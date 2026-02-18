/**
 * Create test SQLite DB with minimal schema for API tests.
 * Uses better-sqlite3 to avoid native sqlite3 bindings (same as app).
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

const MINIMAL_BOOKS = `
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    description TEXT,
    crawl_status TEXT DEFAULT 'discovered',
    category TEXT,
    language TEXT,
    duration INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`.trim();

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
  runSql(db, MINIMAL_BOOKS);
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
    [1, 'First Audiobook', 'Author Alpha', 'Description one', 'completed', 'Fiction', 'hy', 3600, now, now],
    [2, 'Second Book', 'Author Beta', 'Description two', 'completed', 'Non-Fiction', 'hy', 7200, now, now],
    [3, 'Third Title', 'Author Alpha', 'Another description', 'discovered', 'Fiction', 'en', 1800, now, now]
  ];
  for (const row of rows) {
    await db.run(
      'INSERT OR REPLACE INTO books (id, title, author, description, crawl_status, category, language, duration, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      row
    );
  }
}

module.exports = { createTestDb, getTestDbPath, seedBooks };
