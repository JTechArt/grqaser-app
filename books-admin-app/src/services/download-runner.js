/**
 * Download pipeline runner (Epic 12).
 * Runs pipeline in background; exposes progress and cancel for API routes.
 */

const Database = require('better-sqlite3');
const crypto = require('crypto');
const { run: runPipeline } = require('./download-pipeline');
const repo = require('../models/admin-download-repository');

let _state = {
  isRunning: false,
  batchId: null,
  cancelSignal: { cancelled: false },
  lastProgress: null,
  startTime: null,
  runPromise: null
};

/**
 * Check if a download batch is currently running.
 * @returns {boolean}
 */
function isRunning() {
  return _state.isRunning;
}

/**
 * Get current batch id (if running) or null.
 * @returns {string|null}
 */
function getCurrentBatchId() {
  return _state.batchId;
}

/**
 * Get last progress snapshot for status endpoint.
 * @returns {object|null}
 */
function getLastProgress() {
  return _state.lastProgress;
}

/**
 * Get start time for elapsed calculation.
 * @returns {Date|null}
 */
function getStartTime() {
  return _state.startTime;
}

/**
 * Get cancel signal; setting .cancelled = true stops the pipeline.
 * @returns {{ cancelled: boolean }}
 */
function getCancelSignal() {
  return _state.cancelSignal;
}

/**
 * Start the download pipeline in the background.
 * @param {object} options
 * @param {string} options.dbPath - Path to SQLite database (active DB)
 * @param {string} options.baseFolderPath - Base folder for download
 * @param {number} [options.maxSizeBytes] - Storage cap (default 200GB)
 * @param {number[]} [options.bookIds] - Book IDs; if null/empty, use all
 */
function startDownload(options) {
  const { dbPath, baseFolderPath, maxSizeBytes, bookIds } = options;

  if (_state.isRunning) {
    throw new Error('A download batch is already running');
  }

  const db = new Database(dbPath);
  const batchId = 'batch-' + crypto.randomUUID();
  _state.cancelSignal = { cancelled: false };
  _state.batchId = batchId;
  _state.startTime = new Date();
  _state.lastProgress = { phase: 1, phaseLabel: 'Starting...', batchId };
  _state.isRunning = true;

  const resolveBookIds = (ids) => {
    if (ids && Array.isArray(ids) && ids.length > 0) return ids;
    const rows = db.prepare('SELECT id FROM books ORDER BY id').all();
    return rows.map((r) => r.id);
  };

  const resolvedIds = resolveBookIds(bookIds);

  const runPromise = runPipeline({
    db,
    baseFolderPath,
    maxSizeBytes,
    bookIds: resolvedIds,
    batchId,
    cancelSignal: _state.cancelSignal,
    onProgress: (p) => {
      _state.lastProgress = { ...p, elapsed_seconds: Math.round((Date.now() - _state.startTime.getTime()) / 1000) };
    }
  })
    .then((result) => {
      _state.isRunning = false;
      _state.lastProgress = _state.lastProgress
        ? { ..._state.lastProgress, status: result.status, booksCompleted: result.booksCompleted, totalSizeBytes: result.totalSizeBytes }
        : { status: result.status, booksCompleted: result.booksCompleted, totalSizeBytes: result.totalSizeBytes };
      db.close();
      return result;
    })
    .catch((err) => {
      _state.isRunning = false;
      _state.lastProgress = _state.lastProgress
        ? { ..._state.lastProgress, status: 'failed', error: err.message }
        : { status: 'failed', error: err.message };
      db.close();
      throw err;
    });

  _state.runPromise = runPromise;
  return { batchId };
}

/**
 * Cancel the running batch. Returns true if cancelled, false if batch not running or id mismatch.
 * @param {string} [batchId] - If provided, only cancel if current batch matches
 * @returns {boolean}
 */
function cancel(batchId) {
  if (!_state.isRunning) return false;
  if (batchId && _state.batchId !== batchId) return false;
  _state.cancelSignal.cancelled = true;
  return true;
}

/**
 * Get status object for API: running, batch_id, phase, book_index, etc.
 * @returns {object|null}
 */
function getStatus() {
  if (!_state.isRunning || !_state.lastProgress) return null;
  const elapsed = _state.startTime ? Math.round((Date.now() - _state.startTime.getTime()) / 1000) : 0;
  return {
    running: true,
    batch_id: _state.batchId,
    ..._state.lastProgress,
    elapsed_seconds: _state.lastProgress.elapsed_seconds ?? elapsed,
    storage_used: _state.lastProgress.totalSizeBytes ?? _state.lastProgress.total_size_bytes ?? 0,
    storage_limit: _state.lastProgress.maxSizeBytes ?? 0
  };
}

module.exports = {
  isRunning,
  getCurrentBatchId,
  getLastProgress,
  getStartTime,
  getCancelSignal,
  startDownload,
  cancel,
  getStatus
};
