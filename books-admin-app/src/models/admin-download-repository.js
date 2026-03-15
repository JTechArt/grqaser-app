/**
 * Persistence for admin_download_batches and admin_downloaded_books.
 * Epic 12: MP3 bulk download tracking.
 *
 * Expects migration 002 to have been run. Uses raw better-sqlite3 db instance.
 */

/**
 * Create a batch record
 * @param {object} db - better-sqlite3 Database instance
 * @param {object} batch - { id, base_folder_path, max_size_bytes, config_json }
 * @returns {object} inserted row
 */
function createBatch(db, batch) {
  const now = new Date().toISOString();
  const configJson = typeof batch.config_json === 'string'
    ? batch.config_json
    : JSON.stringify(batch.config_json || {});

  db.prepare(`
    INSERT INTO admin_download_batches (
      id, base_folder_path, max_size_bytes, status,
      books_downloaded, total_size_bytes, started_at, config_json
    ) VALUES (?, ?, ?, 'preparing', 0, 0, ?, ?)
  `).run(
    batch.id,
    batch.base_folder_path,
    batch.max_size_bytes,
    now,
    configJson
  );

  return db.prepare('SELECT * FROM admin_download_batches WHERE id = ?').get(batch.id);
}

/**
 * Update batch status and optional fields
 * @param {object} db - better-sqlite3 Database instance
 * @param {string} batchId - batch id
 * @param {object} updates - { status, books_downloaded?, total_size_bytes?, completed_at?, duration_seconds? }
 */
function updateBatch(db, batchId, updates) {
  const allowed = ['status', 'books_downloaded', 'total_size_bytes', 'completed_at', 'duration_seconds', 'config_json'];
  const setParts = [];
  const params = [];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      setParts.push(`${key} = ?`);
      params.push(updates[key]);
    }
  }
  if (setParts.length === 0) return;

  params.push(batchId);
  db.prepare(`UPDATE admin_download_batches SET ${setParts.join(', ')} WHERE id = ?`).run(...params);
}

/**
 * Create a downloaded_books record
 * @param {object} db - better-sqlite3 Database instance
 * @param {object} record - { book_id, download_batch_id, local_folder_path, part_count, status }
 * @returns {number} inserted id
 */
function createDownloadedBook(db, record) {
  const result = db.prepare(`
    INSERT INTO admin_downloaded_books (
      book_id, download_batch_id, local_folder_path, part_count, status
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    record.book_id,
    record.download_batch_id,
    record.local_folder_path,
    record.part_count,
    record.status || 'pending'
  );

  return result.lastInsertRowid;
}

/**
 * Update a downloaded_books record
 * @param {object} db - better-sqlite3 Database instance
 * @param {number} id - admin_downloaded_books.id
 * @param {object} updates - { status, parts_downloaded?, total_size_bytes?, started_at?, completed_at?, error_message? }
 */
function updateDownloadedBook(db, id, updates) {
  const allowed = ['status', 'parts_downloaded', 'total_size_bytes', 'started_at', 'completed_at', 'error_message'];
  const setParts = [];
  const params = [];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      setParts.push(`${key} = ?`);
      params.push(updates[key]);
    }
  }
  if (setParts.length === 0) return;

  params.push(id);
  db.prepare(`UPDATE admin_downloaded_books SET ${setParts.join(', ')} WHERE id = ?`).run(...params);
}

/**
 * Get batch by id
 * @param {object} db - better-sqlite3 Database instance
 * @param {string} batchId
 * @returns {object|null}
 */
function getBatchById(db, batchId) {
  return db.prepare('SELECT * FROM admin_download_batches WHERE id = ?').get(batchId);
}

/**
 * Get active batch (status in preparing, downloading, or paused)
 * @param {object} db - better-sqlite3 Database instance
 * @returns {object|null}
 */
function getActiveBatch(db) {
  return db.prepare(`
    SELECT * FROM admin_download_batches
    WHERE status IN ('preparing', 'downloading', 'paused')
    ORDER BY started_at DESC
    LIMIT 1
  `).get();
}

/**
 * Get downloaded books for a batch
 * @param {object} db - better-sqlite3 Database instance
 * @param {string} batchId
 * @returns {object[]}
 */
function getBatchBooks(db, batchId) {
  return db.prepare(`
    SELECT adb.*, books.title as book_title, books.author as book_author, books.duration_formatted as book_duration
    FROM admin_downloaded_books adb
    LEFT JOIN books ON books.id = adb.book_id
    WHERE adb.download_batch_id = ?
    ORDER BY adb.id
  `).all(batchId);
}

/**
 * Get downloaded_books record by batch id and book id
 * @param {object} db - better-sqlite3 Database instance
 * @param {string} batchId
 * @param {number} bookId
 * @returns {object|null}
 */
function getDownloadedBookByBatchAndBook(db, batchId, bookId) {
  return db.prepare(`
    SELECT * FROM admin_downloaded_books
    WHERE download_batch_id = ? AND book_id = ?
    LIMIT 1
  `).get(batchId, bookId);
}

/**
 * List all batches (reverse chronological)
 * @param {object} db - better-sqlite3 Database instance
 * @param {object} options - { limit?, offset? }
 * @returns {object[]}
 */
function listBatches(db, options = {}) {
  const limit = Math.min(Number(options.limit) || 50, 100);
  const offset = Math.max(0, Number(options.offset) || 0);

  return db.prepare(`
    SELECT * FROM admin_download_batches
    ORDER BY started_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

module.exports = {
  createBatch,
  updateBatch,
  createDownloadedBook,
  updateDownloadedBook,
  getBatchById,
  getActiveBatch,
  getBatchBooks,
  getDownloadedBookByBatchAndBook,
  listBatches
};
