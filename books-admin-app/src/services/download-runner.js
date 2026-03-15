/**
 * Download pipeline runner (Epic 12).
 * Runs pipeline in background; exposes progress and cancel for API routes.
 */

const Database = require('better-sqlite3');
const crypto = require('crypto');
const { run: runPipeline } = require('./download-pipeline');
const downloadLogStore = require('./download-log-store');

let _state = {
  isRunning: false,
  batchId: null,
  cancelSignal: { cancelled: false },
  lastProgress: null,
  startTime: null,
  runPromise: null,
  lastLogSignature: null,
  lastLogAt: 0
};

function formatActiveBooks(activeBooks) {
  if (!Array.isArray(activeBooks) || activeBooks.length === 0) {
    return 'none';
  }
  return activeBooks
    .slice(0, 3)
    .map((book) => {
      const partIndex = book.part_index != null ? book.part_index + 1 : 0;
      const partTotal = book.part_total || 0;
      const suffix = partTotal > 0 ? ` p${partIndex}/${partTotal}` : '';
      return `${book.title || book.book_id}${suffix}`;
    })
    .join(', ');
}

function logProgress(progress, startTime) {
  const now = Date.now();
  const activeBooks = Array.isArray(progress.activeBooks) ? progress.activeBooks : [];
  const signature = [
    progress.status,
    progress.phase,
    progress.booksCompleted,
    progress.booksFailed,
    progress.booksQueued,
    progress.activeWorkers,
    activeBooks.map((book) => `${book.book_id}:${book.part_index}:${book.parts_downloaded}`).join('|')
  ].join(':');

  if (_state.lastLogSignature === signature && now - _state.lastLogAt < 5000) {
    return;
  }

  _state.lastLogSignature = signature;
  _state.lastLogAt = now;
  const elapsedSeconds = startTime ? Math.round((now - startTime.getTime()) / 1000) : 0;
  console.log(
    '[download] batch=%s status=%s phase=%s completed=%d failed=%d active=%d/%d queued=%d size=%d elapsed=%ss activeBooks=%s',
    progress.batchId,
    progress.status || 'unknown',
    progress.phaseLabel || progress.phase || '-',
    progress.booksCompleted || 0,
    progress.booksFailed || 0,
    progress.activeWorkers || 0,
    progress.concurrencyLimit || 0,
    progress.booksQueued || 0,
    progress.totalSizeBytes || 0,
    elapsedSeconds,
    formatActiveBooks(activeBooks)
  );
  downloadLogStore.info(
    `batch=${progress.batchId} status=${progress.status || 'unknown'} phase=${progress.phaseLabel || progress.phase || '-'} `
      + `completed=${progress.booksCompleted || 0} failed=${progress.booksFailed || 0} `
      + `active=${progress.activeWorkers || 0}/${progress.concurrencyLimit || 0} queued=${progress.booksQueued || 0} `
      + `size=${progress.totalSizeBytes || 0} activeBooks=${formatActiveBooks(activeBooks)}`
  );
}

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
  _state.lastLogSignature = null;
  _state.lastLogAt = 0;

  const resolveBookIds = (ids) => {
    if (ids && Array.isArray(ids) && ids.length > 0) return ids;
    const rows = db.prepare('SELECT id FROM books ORDER BY id').all();
    return rows.map((r) => r.id);
  };

  const resolvedIds = resolveBookIds(bookIds);
  console.log('[download] starting batch=%s books=%d baseFolder=%s maxSizeBytes=%d', batchId, resolvedIds.length, baseFolderPath, maxSizeBytes || 0);
  downloadLogStore.info(
    `starting batch=${batchId} books=${resolvedIds.length} baseFolder=${baseFolderPath} maxSizeBytes=${maxSizeBytes || 0}`
  );

  const runPromise = runPipeline({
    db,
    baseFolderPath,
    maxSizeBytes,
    bookIds: resolvedIds,
    batchId,
    cancelSignal: _state.cancelSignal,
    onProgress: (p) => {
      _state.lastProgress = { ...p, elapsed_seconds: Math.round((Date.now() - _state.startTime.getTime()) / 1000) };
      logProgress(_state.lastProgress, _state.startTime);
    }
  })
    .then((result) => {
      _state.isRunning = false;
      _state.lastProgress = _state.lastProgress
        ? { ..._state.lastProgress, status: result.status, booksCompleted: result.booksCompleted, totalSizeBytes: result.totalSizeBytes }
        : { status: result.status, booksCompleted: result.booksCompleted, totalSizeBytes: result.totalSizeBytes };
      console.log('[download] batch=%s finished status=%s booksCompleted=%d totalSizeBytes=%d', batchId, result.status, result.booksCompleted || 0, result.totalSizeBytes || 0);
      downloadLogStore.info(
        `finished batch=${batchId} status=${result.status} booksCompleted=${result.booksCompleted || 0} totalSizeBytes=${result.totalSizeBytes || 0}`
      );
      db.close();
      return result;
    })
    .catch((err) => {
      _state.isRunning = false;
      _state.lastProgress = _state.lastProgress
        ? { ..._state.lastProgress, status: 'failed', error: err.message }
        : { status: 'failed', error: err.message };
      console.error('[download] batch=%s failed: %s', batchId, err.message);
      downloadLogStore.error(`failed batch=${batchId}: ${err.message}`);
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
  console.log('[download] cancel requested for batch=%s', _state.batchId);
  downloadLogStore.info(`cancel requested for batch=${_state.batchId}`);
  return true;
}

/**
 * Get status object for API: running, batch_id, phase, book_index, etc.
 * @returns {object|null}
 */
function getStatus() {
  if (!_state.isRunning || !_state.lastProgress) return null;
  const elapsed = _state.startTime ? Math.round((Date.now() - _state.startTime.getTime()) / 1000) : 0;
  const activeBooks = Array.isArray(_state.lastProgress.activeBooks) ? _state.lastProgress.activeBooks : [];
  return {
    running: true,
    batch_id: _state.batchId,
    ..._state.lastProgress,
    elapsed_seconds: _state.lastProgress.elapsed_seconds ?? elapsed,
    storage_used: _state.lastProgress.totalSizeBytes ?? _state.lastProgress.total_size_bytes ?? 0,
    storage_limit: _state.lastProgress.maxSizeBytes ?? 0,
    books_completed: _state.lastProgress.booksCompleted ?? 0,
    books_failed: _state.lastProgress.booksFailed ?? 0,
    books_active: _state.lastProgress.booksActive ?? activeBooks.length,
    books_queued: _state.lastProgress.booksQueued ?? 0,
    active_workers: _state.lastProgress.activeWorkers ?? activeBooks.length,
    concurrency_limit: _state.lastProgress.concurrencyLimit ?? 0,
    active_books: activeBooks
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
  getStatus,
  getLogs: downloadLogStore.getRecent,
  getLogFilePath: downloadLogStore.getLogFilePath
};
