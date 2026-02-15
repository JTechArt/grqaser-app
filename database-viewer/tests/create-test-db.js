/**
 * Create an in-memory or file SQLite DB with minimal schema for API tests.
 * Used so crawler/status, /urls, /logs and health have required tables.
 */
const sqlite3 = require('sqlite3').verbose();
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
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => (err ? reject(err) : resolve()));
  });
}

/**
 * Create a test DB at the given path (or :memory:) with minimal schema.
 * @param {string} dbPath - Path to SQLite file or ':memory:'
 * @returns {Promise<void>}
 */
async function createTestDb(dbPath) {
  const db = new sqlite3.Database(dbPath);
  await runSql(db, MINIMAL_BOOKS);
  await runSql(db, MINIMAL_URL_QUEUE);
  await runSql(db, MINIMAL_CRAWL_LOGS);
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}

/**
 * Return a path for a temporary test DB file.
 * @returns {string}
 */
function getTestDbPath() {
  const dir = path.join(os.tmpdir(), 'grqaser-database-viewer-test');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, `test-${Date.now()}.db`);
}

/**
 * Seed books table with sample data for API tests.
 * Call with database model instance after connect().
 * @param {object} db - Database model with run() method
 */
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
