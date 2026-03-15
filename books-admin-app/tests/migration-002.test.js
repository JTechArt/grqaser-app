/**
 * Tests for migration 002: Admin Download Tables (Epic 12)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');
const migration = require('../src/migrations/002-admin-download-tables');

// Minimal books table required for admin_downloaded_books FK
const MINIMAL_BOOKS_TABLE = `
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(200) DEFAULT 'Unknown Author'
  )
`;

describe('Migration 002: Admin Download Tables', () => {
  let testDbPath;
  let db;

  beforeEach(() => {
    testDbPath = path.join(os.tmpdir(), `test-migration-002-${Date.now()}.db`);
    db = new Database(testDbPath);

    // Create books table (required for admin_downloaded_books FK)
    db.exec(MINIMAL_BOOKS_TABLE);
    db.prepare('INSERT INTO books (id, title, author) VALUES (1, ?, ?)').run('Test Book', 'Test Author');
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (testDbPath && fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  test('should create admin_download_batches table', () => {
    migration.up(db);

    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_download_batches'"
    ).get();
    expect(table).toBeDefined();
    expect(table.name).toBe('admin_download_batches');
  });

  test('should create admin_downloaded_books table', () => {
    migration.up(db);

    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_downloaded_books'"
    ).get();
    expect(table).toBeDefined();
    expect(table.name).toBe('admin_downloaded_books');
  });

  test('should create admin_download_batches with correct columns', () => {
    migration.up(db);

    const columns = db.prepare("PRAGMA table_info(admin_download_batches)").all();
    const names = columns.map((c) => c.name);

    expect(names).toContain('id');
    expect(names).toContain('base_folder_path');
    expect(names).toContain('max_size_bytes');
    expect(names).toContain('status');
    expect(names).toContain('books_downloaded');
    expect(names).toContain('total_size_bytes');
    expect(names).toContain('started_at');
    expect(names).toContain('completed_at');
    expect(names).toContain('duration_seconds');
    expect(names).toContain('config_json');
  });

  test('should create admin_downloaded_books with correct columns', () => {
    migration.up(db);

    const columns = db.prepare("PRAGMA table_info(admin_downloaded_books)").all();
    const names = columns.map((c) => c.name);

    expect(names).toContain('id');
    expect(names).toContain('book_id');
    expect(names).toContain('download_batch_id');
    expect(names).toContain('local_folder_path');
    expect(names).toContain('total_size_bytes');
    expect(names).toContain('part_count');
    expect(names).toContain('parts_downloaded');
    expect(names).toContain('status');
    expect(names).toContain('started_at');
    expect(names).toContain('completed_at');
    expect(names).toContain('error_message');
  });

  test('should create required indexes', () => {
    migration.up(db);

    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index'"
    ).all();
    const indexNames = indexes.map((i) => i.name);

    expect(indexNames).toContain('idx_admin_download_batches_status');
    expect(indexNames).toContain('idx_admin_download_batches_started_at');
    expect(indexNames).toContain('idx_admin_downloaded_books_batch_id');
    expect(indexNames).toContain('idx_admin_downloaded_books_book_id');
    expect(indexNames).toContain('idx_admin_downloaded_books_status');
    expect(indexNames).toContain('uidx_admin_downloaded_books_batch_book');
  });

  test('should insert and query batch and book rows', () => {
    migration.up(db);

    const batchId = 'batch-test-001';
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO admin_download_batches (id, base_folder_path, max_size_bytes, status, started_at, config_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(batchId, '/tmp/downloads', 200 * 1024 * 1024 * 1024, 'preparing', now, '{}');

    db.prepare(`
      INSERT INTO admin_downloaded_books (book_id, download_batch_id, local_folder_path, part_count, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(1, batchId, '/tmp/downloads/1_test-book', 3, 'pending');

    const batch = db.prepare('SELECT * FROM admin_download_batches WHERE id = ?').get(batchId);
    expect(batch).toBeDefined();
    expect(batch.base_folder_path).toBe('/tmp/downloads');
    expect(batch.status).toBe('preparing');

    const book = db.prepare('SELECT * FROM admin_downloaded_books WHERE book_id = 1').get();
    expect(book).toBeDefined();
    expect(book.download_batch_id).toBe(batchId);
    expect(book.status).toBe('pending');
  });

  test('should enforce unique batch+book constraint', () => {
    migration.up(db);

    const batchId = 'batch-test-002';
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO admin_download_batches (id, base_folder_path, max_size_bytes, status, started_at, config_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(batchId, '/tmp/downloads', 200e9, 'preparing', now, '{}');

    db.prepare(`
      INSERT INTO admin_downloaded_books (book_id, download_batch_id, local_folder_path, part_count, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(1, batchId, '/tmp/1', 1, 'pending');

    expect(() => {
      db.prepare(`
        INSERT INTO admin_downloaded_books (book_id, download_batch_id, local_folder_path, part_count, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(1, batchId, '/tmp/1-dup', 1, 'pending');
    }).toThrow();
  });

  test('should rollback migration successfully', () => {
    migration.up(db);

    let batches = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_download_batches'"
    ).get();
    expect(batches).toBeDefined();

    migration.down(db);

    batches = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_download_batches'"
    ).get();
    expect(batches).toBeUndefined();

    const books = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_downloaded_books'"
    ).get();
    expect(books).toBeUndefined();
  });

  test('should handle migration on already migrated database', () => {
    migration.up(db);
    expect(() => migration.up(db)).not.toThrow();

    const batches = db.prepare('SELECT COUNT(*) as count FROM admin_download_batches').get();
    expect(batches.count).toBe(0);
  });
});
