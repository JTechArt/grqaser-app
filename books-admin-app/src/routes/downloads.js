/**
 * Download batch API: start, cancel, status, SSE stream, list, detail.
 * Epic 12: MP3 bulk download for books-admin-app.
 *
 * @see docs/feature-requests/mp3-bulk-download-admin.md
 * @see docs/architecture/books-admin-app-architecture.md
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');
const downloadRunner = require('../services/download-runner');
const adminDownloadRepo = require('../models/admin-download-repository');
const { DEFAULT_MAX_SIZE_BYTES, DEFAULT_MAX_CONCURRENT_BOOKS } = require('../services/download-pipeline');

function createDownloadsRouter(dbRegistry) {
  const router = express.Router();

  function getDb() {
    const dbPath = dbRegistry.getActivePath();
    return new Database(dbPath);
  }

  /**
   * Validate base_folder_path: exists or can be created, writable.
   */
  function validateFolder(baseFolderPath) {
    const resolved = path.resolve(baseFolderPath);
    if (resolved.includes('..') && !path.isAbsolute(baseFolderPath)) {
      throw new Error('Invalid path: path traversal not allowed');
    }
    const parent = path.dirname(resolved);
    if (!fs.existsSync(parent)) {
      throw new Error('Parent directory does not exist: ' + parent);
    }
    if (!fs.existsSync(resolved)) {
      try {
        fs.mkdirSync(resolved, { recursive: true });
      } catch (err) {
        throw new Error('Cannot create folder: ' + err.message);
      }
    }
    const testFile = path.join(resolved, '.write-test-' + Date.now());
    try {
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
    } catch (err) {
      throw new Error('Folder is not writable: ' + err.message);
    }
  }

  /**
   * Resolve book IDs from request: array of ids, or "all" for all books.
   */
  function resolveBookIds(db, bookIdsParam) {
    if (bookIdsParam === 'all' || bookIdsParam === null || bookIdsParam === undefined) {
      const rows = db.prepare('SELECT id FROM books ORDER BY id').all();
      return rows.map((r) => r.id);
    }
    if (Array.isArray(bookIdsParam)) {
      return bookIdsParam.filter((id) => Number.isInteger(Number(id)) && Number(id) > 0).map(Number);
    }
    if (typeof bookIdsParam === 'string' && bookIdsParam.trim().toLowerCase() === 'all') {
      const rows = db.prepare('SELECT id FROM books ORDER BY id').all();
      return rows.map((r) => r.id);
    }
    return [];
  }

  // POST /start — Start a new batch
  router.post('/start', (req, res) => {
    const { base_folder_path, max_size_bytes, book_ids } = req.body || {};

    if (!base_folder_path || typeof base_folder_path !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_BASE_FOLDER', message: 'base_folder_path is required' }
      });
    }

    const db = getDb();
    try {
      if (downloadRunner.isRunning()) {
        return res.status(409).json({
          success: false,
          error: { code: 'BATCH_ALREADY_RUNNING', message: 'A download batch is already running' }
        });
      }

      const activeBatch = adminDownloadRepo.getActiveBatch(db);
      if (activeBatch) {
        return res.status(409).json({
          success: false,
          error: { code: 'BATCH_ALREADY_RUNNING', message: 'An active batch exists: ' + activeBatch.id }
        });
      }

      validateFolder(base_folder_path);
      const bookIds = resolveBookIds(db, book_ids);
      if (bookIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_BOOKS', message: 'No books found for download. Specify book_ids array or "all".' }
        });
      }

      const maxBytes = max_size_bytes != null ? Number(max_size_bytes) : DEFAULT_MAX_SIZE_BYTES;

      const { batchId } = downloadRunner.startDownload({
        dbPath: dbRegistry.getActivePath(),
        baseFolderPath: path.resolve(base_folder_path),
        maxSizeBytes: maxBytes,
        bookIds
      });

      res.status(202).json({
        success: true,
        data: {
          batch_id: batchId,
          message: 'Download batch started',
          book_count: bookIds.length
        }
      });
    } catch (err) {
      console.error('[route:downloads] POST /start error:', err.message);
      const status = err.message.includes('writable') || err.message.includes('Invalid') ? 400 : 500;
      res.status(status).json({
        success: false,
        error: { code: 'START_ERROR', message: err.message }
      });
    } finally {
      db.close();
    }
  });

  function stopBatch(req, res) {
    const { batchId } = req.params;
    if (!batchId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_BATCH_ID', message: 'batchId is required' }
      });
    }

    try {
      const cancelled = downloadRunner.cancel(batchId);
      if (!cancelled) {
        return res.status(404).json({
          success: false,
          error: { code: 'BATCH_NOT_RUNNING', message: 'Batch is not running or does not exist: ' + batchId }
        });
      }
      res.json({ success: true, data: { message: 'Cancel requested', batch_id: batchId } });
    } catch (err) {
      console.error('[route:downloads] POST /stop error:', err.message);
      res.status(500).json({
        success: false,
        error: { code: 'STOP_ERROR', message: err.message }
      });
    }
  }

  // POST /:batchId/stop — Stop a running batch
  router.post('/:batchId/stop', stopBatch);

  // Backward-compatible alias for older UI wiring.
  router.post('/:batchId/cancel', stopBatch);

  // GET /status — Current batch status (polling)
  router.get('/status', (req, res) => {
    const db = getDb();
    try {
      const runnerStatus = downloadRunner.getStatus();
      if (runnerStatus) {
        return res.json({ success: true, data: runnerStatus });
      }

      const activeBatch = adminDownloadRepo.getActiveBatch(db);
      if (activeBatch) {
        const startedAt = activeBatch.started_at ? new Date(activeBatch.started_at).getTime() : Date.now();
        const elapsed = Math.round((Date.now() - startedAt) / 1000);
        return res.json({
          success: true,
          data: {
            running: false,
            batch_id: activeBatch.id,
            status: activeBatch.status,
            phase: null,
            book_index: null,
            book_total: null,
            part_index: null,
            part_total: null,
            book_title: null,
            books_completed: activeBatch.books_downloaded || 0,
            books_failed: 0,
            books_active: 0,
            books_queued: 0,
            total_size_bytes: activeBatch.total_size_bytes || 0,
            elapsed_seconds: elapsed,
            storage_used: activeBatch.total_size_bytes || 0,
            storage_limit: activeBatch.max_size_bytes || 0,
            active_workers: 0,
            concurrency_limit: DEFAULT_MAX_CONCURRENT_BOOKS,
            active_books: []
          }
        });
      }

      const lastBatch = adminDownloadRepo.listBatches(db, { limit: 1 })[0];
      if (lastBatch) {
        return res.json({
          success: true,
          data: {
            running: false,
            batch_id: lastBatch.id,
            status: lastBatch.status,
            phase: null,
            books_completed: lastBatch.books_downloaded || 0,
            books_failed: 0,
            books_active: 0,
            books_queued: 0,
            total_size_bytes: lastBatch.total_size_bytes || 0,
            elapsed_seconds: lastBatch.duration_seconds || 0,
            storage_used: lastBatch.total_size_bytes || 0,
            storage_limit: lastBatch.max_size_bytes || 0,
            active_workers: 0,
            concurrency_limit: DEFAULT_MAX_CONCURRENT_BOOKS,
            active_books: []
          }
        });
      }

      res.json({
        success: true,
        data: {
          running: false,
          batch_id: null,
          status: null,
          books_completed: 0,
          books_failed: 0,
          books_active: 0,
          books_queued: 0,
          active_workers: 0,
          concurrency_limit: DEFAULT_MAX_CONCURRENT_BOOKS,
          active_books: []
        }
      });
    } catch (err) {
      console.error('[route:downloads] GET /status error:', err.message);
      res.status(500).json({
        success: false,
        error: { code: 'STATUS_ERROR', message: err.message }
      });
    } finally {
      db.close();
    }
  });

  // GET /stream — SSE progress stream
  router.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (data) => {
      res.write('data: ' + JSON.stringify(data) + '\n\n');
    };

    const interval = setInterval(() => {
      const db = getDb();
      try {
        const runnerStatus = downloadRunner.getStatus();
        if (runnerStatus) {
          sendEvent(runnerStatus);
          return;
        }
        const activeBatch = adminDownloadRepo.getActiveBatch(db);
        if (activeBatch) {
          const startedAt = activeBatch.started_at ? new Date(activeBatch.started_at).getTime() : Date.now();
          sendEvent({
            running: false,
            batch_id: activeBatch.id,
            status: activeBatch.status,
            books_completed: activeBatch.books_downloaded || 0,
            total_size_bytes: activeBatch.total_size_bytes || 0,
            elapsed_seconds: Math.round((Date.now() - startedAt) / 1000),
            storage_used: activeBatch.total_size_bytes || 0,
            storage_limit: activeBatch.max_size_bytes || 0
          });
        }
      } finally {
        db.close();
      }
    }, 1000);

    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  });

  // GET /logs — recent download logs for UI/debugging
  router.get('/logs', (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
      res.json({
        success: true,
        data: {
          log_file: downloadRunner.getLogFilePath(),
          logs: downloadRunner.getLogs(limit)
        }
      });
    } catch (err) {
      console.error('[route:downloads] GET /logs error:', err.message);
      res.status(500).json({
        success: false,
        error: { code: 'LOGS_ERROR', message: err.message }
      });
    }
  });

  // GET /batches — List all batches (reverse chronological)
  router.get('/batches', (req, res) => {
    const db = getDb();
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
      const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
      const batches = adminDownloadRepo.listBatches(db, { limit, offset });
      res.json({
        success: true,
        data: {
          batches: batches.map((b) => ({
            id: b.id,
            base_folder_path: b.base_folder_path,
            status: b.status,
            books_downloaded: b.books_downloaded || 0,
            total_size_bytes: b.total_size_bytes || 0,
            duration_seconds: b.duration_seconds,
            started_at: b.started_at,
            completed_at: b.completed_at
          }))
        }
      });
    } catch (err) {
      console.error('[route:downloads] GET /batches error:', err.message);
      res.status(500).json({
        success: false,
        error: { code: 'LIST_ERROR', message: err.message }
      });
    } finally {
      db.close();
    }
  });

  // GET /batches/:batchId — Batch detail with books
  router.get('/batches/:batchId', (req, res) => {
    const { batchId } = req.params;
    const db = getDb();
    try {
      const batch = adminDownloadRepo.getBatchById(db, batchId);
      if (!batch) {
        return res.status(404).json({
          success: false,
          error: { code: 'BATCH_NOT_FOUND', message: 'Batch not found: ' + batchId }
        });
      }

      const books = adminDownloadRepo.getBatchBooks(db, batchId);
      res.json({
        success: true,
        data: {
          id: batch.id,
          base_folder_path: batch.base_folder_path,
          status: batch.status,
          books_downloaded: batch.books_downloaded || 0,
          total_size_bytes: batch.total_size_bytes || 0,
          duration_seconds: batch.duration_seconds,
          started_at: batch.started_at,
          completed_at: batch.completed_at,
          books: books.map((b) => ({
            book_id: b.book_id,
            title: b.book_title,
            author: b.book_author,
            local_folder_path: b.local_folder_path,
            total_size_bytes: b.total_size_bytes || 0,
            duration: b.book_duration,
            status: b.status,
            error_message: b.error_message,
            parts_downloaded: b.parts_downloaded || 0,
            part_count: b.part_count
          }))
        }
      });
    } catch (err) {
      console.error('[route:downloads] GET /batches/:id error:', err.message);
      res.status(500).json({
        success: false,
        error: { code: 'DETAIL_ERROR', message: err.message }
      });
    } finally {
      db.close();
    }
  });

  return router;
}

module.exports = createDownloadsRouter;
