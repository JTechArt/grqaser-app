/**
 * Migration 002: Admin Download Tables (Epic 12)
 *
 * Creates admin_download_batches and admin_downloaded_books for MP3 bulk download
 * tracking. These tables live in the books-admin-app active SQLite database alongside
 * the catalog tables.
 *
 * See docs/feature-requests/mp3-bulk-download-admin.md and
 * docs/architecture/data-models-and-schema.md.
 */

const ADMIN_DOWNLOAD_BATCHES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS admin_download_batches (
    id TEXT PRIMARY KEY,
    base_folder_path TEXT NOT NULL,
    max_size_bytes INTEGER NOT NULL,
    status TEXT NOT NULL,
    books_downloaded INTEGER DEFAULT 0,
    total_size_bytes INTEGER DEFAULT 0,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    duration_seconds INTEGER,
    config_json TEXT NOT NULL DEFAULT '{}'
  )
`;

const ADMIN_DOWNLOAD_BATCHES_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_admin_download_batches_status ON admin_download_batches(status)',
  'CREATE INDEX IF NOT EXISTS idx_admin_download_batches_started_at ON admin_download_batches(started_at)'
];

const ADMIN_DOWNLOADED_BOOKS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS admin_downloaded_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES books(id),
    download_batch_id TEXT NOT NULL REFERENCES admin_download_batches(id),
    local_folder_path TEXT NOT NULL,
    total_size_bytes INTEGER DEFAULT 0,
    part_count INTEGER NOT NULL,
    parts_downloaded INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    error_message TEXT
  )
`;

const ADMIN_DOWNLOADED_BOOKS_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_admin_downloaded_books_batch_id ON admin_downloaded_books(download_batch_id)',
  'CREATE INDEX IF NOT EXISTS idx_admin_downloaded_books_book_id ON admin_downloaded_books(book_id)',
  'CREATE INDEX IF NOT EXISTS idx_admin_downloaded_books_status ON admin_downloaded_books(status)',
  'CREATE UNIQUE INDEX IF NOT EXISTS uidx_admin_downloaded_books_batch_book ON admin_downloaded_books(download_batch_id, book_id)'
];

/**
 * Run the migration
 * @param {Database} db - better-sqlite3 database instance
 * @returns {object} Migration results
 */
function up(db) {
  console.log('Starting migration 002: Admin Download Tables...');

  // Create parent table first (admin_downloaded_books references it)
  console.log('Creating admin_download_batches table...');
  db.exec(ADMIN_DOWNLOAD_BATCHES_TABLE_SQL);

  console.log('Creating admin_download_batches indexes...');
  ADMIN_DOWNLOAD_BATCHES_INDEXES.forEach((sql) => db.exec(sql));

  // Create child table
  console.log('Creating admin_downloaded_books table...');
  db.exec(ADMIN_DOWNLOADED_BOOKS_TABLE_SQL);

  console.log('Creating admin_downloaded_books indexes...');
  ADMIN_DOWNLOADED_BOOKS_INDEXES.forEach((sql) => db.exec(sql));

  // Verify tables exist
  const batches = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_download_batches'"
  ).get();
  const books = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_downloaded_books'"
  ).get();

  if (!batches || !books) {
    throw new Error('Migration 002 failed: tables were not created');
  }

  console.log('Migration 002 completed successfully!');

  return {
    tablesCreated: ['admin_download_batches', 'admin_downloaded_books'],
    indexesCreated: ADMIN_DOWNLOAD_BATCHES_INDEXES.length + ADMIN_DOWNLOADED_BOOKS_INDEXES.length
  };
}

/**
 * Rollback the migration
 * @param {Database} db - better-sqlite3 database instance
 */
function down(db) {
  console.log('Rolling back migration 002: Admin Download Tables...');

  // Drop child table first (references parent)
  console.log('Dropping admin_downloaded_books indexes...');
  db.exec('DROP INDEX IF EXISTS uidx_admin_downloaded_books_batch_book');
  db.exec('DROP INDEX IF EXISTS idx_admin_downloaded_books_status');
  db.exec('DROP INDEX IF EXISTS idx_admin_downloaded_books_book_id');
  db.exec('DROP INDEX IF EXISTS idx_admin_downloaded_books_batch_id');

  console.log('Dropping admin_downloaded_books table...');
  db.exec('DROP TABLE IF EXISTS admin_downloaded_books');

  console.log('Dropping admin_download_batches indexes...');
  db.exec('DROP INDEX IF EXISTS idx_admin_download_batches_started_at');
  db.exec('DROP INDEX IF EXISTS idx_admin_download_batches_status');

  console.log('Dropping admin_download_batches table...');
  db.exec('DROP TABLE IF EXISTS admin_download_batches');

  console.log('Rollback completed!');
}

module.exports = {
  up,
  down,
  ADMIN_DOWNLOAD_BATCHES_TABLE_SQL,
  ADMIN_DOWNLOADED_BOOKS_TABLE_SQL
};
