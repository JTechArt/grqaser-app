const Database = require('better-sqlite3');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repo = require('../src/models/admin-download-repository');

describe('admin-download-repository schema bootstrap', () => {
  let dbPath;
  let db;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `admin-download-repo-${Date.now()}.db`);
    db = new Database(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT DEFAULT 'Unknown Author',
        duration_formatted TEXT
      )
    `);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (dbPath && fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  test('creates admin download tables on first query', () => {
    const activeBatch = repo.getActiveBatch(db);

    expect(activeBatch).toBeUndefined();

    const batchesTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_download_batches'"
    ).get();
    const booksTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_downloaded_books'"
    ).get();

    expect(batchesTable).toBeDefined();
    expect(booksTable).toBeDefined();
  });
});
