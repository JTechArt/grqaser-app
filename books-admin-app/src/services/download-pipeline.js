/**
 * Download pipeline service (Epic 12).
 * Runs in three phases: (1) Create structure, (2) Folders and metadata, (3) Download MP3s.
 * Supports storage limit check, auto-pause, cancellation, and progress reporting.
 *
 * @see docs/feature-requests/mp3-bulk-download-admin.md
 * @see docs/architecture/books-admin-app-architecture.md
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const repo = require('../models/admin-download-repository');
const { filterValidUrls } = require('../crawler/utils/url-validator');

const DEFAULT_MAX_SIZE_BYTES = 200 * 1024 * 1024 * 1024; // 200GB
const DEFAULT_MAX_CONCURRENT_BOOKS = 10;
const BYTES_PER_MINUTE_ESTIMATE = 1024 * 1024; // ~1MB per minute

/**
 * Sanitize title for folder name. Filesystem-safe, deterministic.
 * @param {string} title
 * @returns {string}
 */
function slugify(title) {
  if (title == null || typeof title !== 'string') return 'book';
  let s = title
    .trim()
    .toLowerCase()
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'book';
}

/**
 * Build manifest entry for a book: metadata, part URLs, estimated size.
 * @param {object} book - Row from books table
 * @returns {{ metadata: object, partUrls: string[], estimatedSizeBytes: number }}
 */
function buildManifestEntry(book) {
  const partUrls = [];
  if (book.main_audio_url) {
    partUrls.push(book.main_audio_url);
  }
  if (book.chapter_urls) {
    const urls = typeof book.chapter_urls === 'string' ? JSON.parse(book.chapter_urls || '[]') : (book.chapter_urls || []);
    if (Array.isArray(urls) && urls.length > 0) {
      partUrls.length = 0;
      partUrls.push(...urls);
    }
  }

  const { valid: validUrls } = filterValidUrls(partUrls);
  const downloadLinks = validUrls;

  const durationMinutes = Number(book.duration) || 0;
  const estimatedSizeBytes =
    book.file_size != null && book.file_size > 0
      ? Number(book.file_size)
      : Math.max(0, durationMinutes * BYTES_PER_MINUTE_ESTIMATE);

  const metadata = {
    id: book.id,
    title: book.title || '',
    description: book.description || '',
    author: book.author || 'Unknown Author',
    duration: book.duration_formatted || `${durationMinutes}m`,
    duration_minutes: durationMinutes,
    grqaser_url: `https://grqaser.org/book/${book.id}`,
    cover_image_url: book.cover_image_url || '',
    main_audio_url: book.main_audio_url || '',
    chapter_urls: partUrls,
    chapter_count: partUrls.length,
    category: book.category || 'Unknown',
    language: book.language || 'hy',
    published_at: book.published_at || null,
    download_links: downloadLinks
  };

  return {
    metadata,
    partUrls: downloadLinks,
    estimatedSizeBytes,
    partCount: Math.max(1, downloadLinks.length)
  };
}

/**
 * Download a single URL to a file path.
 * @param {string} url
 * @param {string} destPath
 * @returns {Promise<number>} Bytes written
 */
async function downloadUrlToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadUrlToFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const writeStream = fs.createWriteStream(destPath);
      res.pipe(writeStream);
      writeStream.on('finish', () => {
        writeStream.close();
        const stat = fs.statSync(destPath);
        resolve(stat.size);
      });
      writeStream.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });
  });
}

/**
 * Run the download pipeline.
 *
 * @param {object} options
 * @param {object} options.db - better-sqlite3 database instance (active DB)
 * @param {string} options.baseFolderPath - Absolute path for batch
 * @param {number} [options.maxSizeBytes] - Storage cap (default 200GB)
 * @param {number[]} options.bookIds - Book IDs in scope
 * @param {string} options.batchId - Batch identifier (e.g. batch-{uuid})
 * @param {{ cancelled: boolean }} [options.cancelSignal] - Set cancelled=true to stop
 * @param {(data: object) => void} [options.onProgress] - Progress callback
 * @returns {Promise<{ status: string, booksCompleted: number, totalSizeBytes: number, error?: string }>}
 */
async function run(options) {
  const {
    db,
    baseFolderPath,
    maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
    maxConcurrentBooks = DEFAULT_MAX_CONCURRENT_BOOKS,
    bookIds,
    batchId,
    cancelSignal = { cancelled: false },
    onProgress = () => {},
    downloadImpl = downloadUrlToFile
  } = options;

  const basePath = path.resolve(baseFolderPath);
  const configJson = JSON.stringify({
    bookIds,
    maxSizeBytes,
    maxConcurrentBooks,
    duplicatePolicy: 'skip_completed',
    pauseReason: null
  });

  const now = () => new Date().toISOString();
  const concurrencyLimit = Math.max(1, Math.min(Number(maxConcurrentBooks) || DEFAULT_MAX_CONCURRENT_BOOKS, DEFAULT_MAX_CONCURRENT_BOOKS));

  const progressState = {
    batchId,
    status: 'preparing',
    phase: 1,
    phaseLabel: 'Creating folder structure',
    bookIndex: null,
    bookTotal: 0,
    partIndex: null,
    partTotal: null,
    bookTitle: null,
    booksCompleted: 0,
    booksFailed: 0,
    booksActive: 0,
    booksQueued: 0,
    totalSizeBytes: 0,
    maxSizeBytes,
    activeWorkers: 0,
    concurrencyLimit,
    activeBooks: []
  };

  const emitProgress = (overrides = {}) => {
    Object.assign(progressState, overrides);
    onProgress({
      ...progressState
    });
  };

  try {
    repo.createBatch(db, {
      id: batchId,
      base_folder_path: basePath,
      max_size_bytes: maxSizeBytes,
      config_json: configJson
    });

    emitProgress({ phase: 1, phaseLabel: 'Creating folder structure', status: 'preparing' });

    // Phase 1: Create base folder, validate write
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }
    const testFile = path.join(basePath, '.write-test-' + Date.now());
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);

    repo.updateBatch(db, batchId, { status: 'downloading' });

    // Load books and build manifest
    const placeholders = bookIds.map(() => '?').join(',');
    const rows = db.prepare(`SELECT * FROM books WHERE id IN (${placeholders})`).all(...bookIds);
    const manifestList = rows.map((book) => ({ book, ...buildManifestEntry(book) }));

    emitProgress({
      phase: 2,
      status: 'downloading',
      phaseLabel: 'Writing metadata',
      bookTotal: manifestList.length
    });

    // Phase 2: Folders and metadata (skip books with no valid download URLs)
    const manifestWithUrls = manifestList.filter((m) => m.partUrls.length > 0);
    for (let i = 0; i < manifestWithUrls.length; i++) {
      if (cancelSignal.cancelled) {
        repo.updateBatch(db, batchId, { status: 'cancelled', completed_at: now() });
        return { status: 'cancelled', booksCompleted: 0, totalSizeBytes: 0 };
      }

      const { book, metadata, partCount } = manifestWithUrls[i];
      const slug = slugify(book.title);
      const folderName = `${book.id}_${slug}`;
      const bookFolder = path.join(basePath, folderName);

      fs.mkdirSync(bookFolder, { recursive: true });

      const metadataPath = path.join(bookFolder, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

      repo.createDownloadedBook(db, {
        book_id: book.id,
        download_batch_id: batchId,
        local_folder_path: bookFolder,
        part_count: partCount,
        status: 'pending'
      });

      emitProgress({
        phase: 2,
        phaseLabel: `Writing metadata for book ${i + 1} of ${manifestWithUrls.length}`,
        bookIndex: i,
        bookTotal: manifestWithUrls.length,
        bookTitle: book.title,
        booksQueued: Math.max(0, manifestWithUrls.length - (i + 1))
      });
    }

    emitProgress({
      phase: 3,
      phaseLabel: 'Downloading MP3s',
      bookIndex: null,
      bookTitle: null,
      partIndex: null,
      partTotal: null,
      bookTotal: manifestWithUrls.length,
      booksQueued: manifestWithUrls.length,
      booksCompleted: 0,
      booksFailed: 0,
      booksActive: 0,
      activeWorkers: 0,
      activeBooks: []
    });

    // Phase 3: Download MP3s
    let currentBatchSize = 0;
    let booksCompleted = 0;
    let booksFailed = 0;
    let reservedBatchSize = 0;
    let queueIndex = 0;
    let pauseReason = null;
    const activeBooksMap = new Map();

    const buildActiveBooksSnapshot = () => Array.from(activeBooksMap.values()).map((entry) => ({
      book_id: entry.bookId,
      queue_index: entry.queueIndex,
      title: entry.bookTitle,
      part_index: entry.partIndex,
      part_total: entry.partTotal,
      parts_downloaded: entry.partsDownloaded,
      total_size_bytes: entry.totalSizeBytes,
      status: entry.status
    }));

    const emitPhase3Progress = (overrides = {}) => {
      const activeBooks = buildActiveBooksSnapshot();
      const nextQueued = Math.max(0, manifestWithUrls.length - queueIndex);
      const currentBook = activeBooks[0] || null;
      emitProgress({
        phase: 3,
        status: pauseReason ? 'paused' : (cancelSignal.cancelled ? 'cancelled' : 'downloading'),
        phaseLabel: currentBook
          ? `Downloading ${activeBooks.length} active book${activeBooks.length === 1 ? '' : 's'}`
          : (pauseReason ? 'Paused' : 'Waiting for download workers'),
        bookIndex: currentBook ? currentBook.queueIndex : null,
        bookTotal: manifestWithUrls.length,
        partIndex: currentBook ? currentBook.part_index : null,
        partTotal: currentBook ? currentBook.part_total : null,
        bookTitle: currentBook ? currentBook.title : null,
        booksCompleted,
        booksFailed,
        booksActive: activeBooks.length,
        booksQueued: nextQueued,
        totalSizeBytes: currentBatchSize,
        activeWorkers: activeBooks.length,
        activeBooks,
        ...overrides
      });
    };

    const processBook = async (manifest, queuePosition) => {
      const { book, partUrls, estimatedSizeBytes, partCount } = manifest;
      const slug = slugify(book.title);
      const folderName = `${book.id}_${slug}`;
      const bookFolder = path.join(basePath, folderName);
      const downloadedBook = repo.getDownloadedBookByBatchAndBook(db, batchId, book.id);

      reservedBatchSize -= estimatedSizeBytes;

      if (!downloadedBook) {
        return;
      }

      if (partUrls.length === 0) {
        booksFailed++;
        repo.updateDownloadedBook(db, downloadedBook.id, {
          status: 'failed',
          completed_at: now(),
          error_message: 'No valid download URLs'
        });
        emitPhase3Progress();
        return;
      }

      repo.updateDownloadedBook(db, downloadedBook.id, {
        status: 'in_progress',
        started_at: now()
      });

      activeBooksMap.set(book.id, {
        bookId: book.id,
        queueIndex: queuePosition,
        bookTitle: book.title,
        partIndex: 0,
        partTotal: partCount,
        partsDownloaded: 0,
        totalSizeBytes: 0,
        status: 'in_progress'
      });
      emitPhase3Progress();

      let bookTotalBytes = 0;
      let partsDownloaded = 0;
      let bookFailed = false;
      let bookError = null;

      for (let p = 0; p < partUrls.length; p++) {
        if (cancelSignal.cancelled) {
          bookFailed = true;
          bookError = 'Cancelled';
          break;
        }

        const url = partUrls[p];
        const partNum = String(p + 1).padStart(3, '0');
        const destPath = path.join(bookFolder, `part_${partNum}.mp3`);

        activeBooksMap.set(book.id, {
          ...activeBooksMap.get(book.id),
          partIndex: p,
          partTotal: partCount,
          partsDownloaded,
          totalSizeBytes: bookTotalBytes,
          status: 'in_progress'
        });
        emitPhase3Progress();

        try {
          const bytes = await downloadImpl(url, destPath);
          bookTotalBytes += bytes;
          partsDownloaded++;
          currentBatchSize += bytes;

          repo.updateDownloadedBook(db, downloadedBook.id, {
            parts_downloaded: partsDownloaded,
            total_size_bytes: bookTotalBytes
          });

          repo.updateBatch(db, batchId, {
            books_downloaded: booksCompleted,
            total_size_bytes: currentBatchSize
          });

          activeBooksMap.set(book.id, {
            ...activeBooksMap.get(book.id),
            partIndex: p,
            partTotal: partCount,
            partsDownloaded,
            totalSizeBytes: bookTotalBytes,
            status: partsDownloaded === partCount ? 'finishing' : 'in_progress'
          });
          emitPhase3Progress();
        } catch (err) {
          bookFailed = true;
          bookError = err.message;
          console.error(`[batch ${batchId}] Book ${book.id} part ${p + 1} failed:`, err.message);
          break;
        }
      }

      activeBooksMap.delete(book.id);

      if (bookFailed) {
        if (bookError !== 'Cancelled') {
          booksFailed++;
        }
        repo.updateDownloadedBook(db, downloadedBook.id, {
          status: bookError === 'Cancelled' ? 'cancelled' : 'failed',
          completed_at: now(),
          error_message: bookError
        });
      } else {
        booksCompleted++;
        repo.updateDownloadedBook(db, downloadedBook.id, {
          status: 'completed',
          completed_at: now(),
          parts_downloaded: partsDownloaded,
          total_size_bytes: bookTotalBytes
        });
        repo.updateBatch(db, batchId, {
          books_downloaded: booksCompleted,
          total_size_bytes: currentBatchSize
        });
      }

      emitPhase3Progress();
    };

    const worker = async () => {
      while (queueIndex < manifestWithUrls.length && !pauseReason) {
        if (cancelSignal.cancelled) {
          return;
        }

        const manifest = manifestWithUrls[queueIndex];
        const queuePosition = queueIndex;
        queueIndex++;

        if (currentBatchSize + reservedBatchSize + manifest.estimatedSizeBytes > maxSizeBytes) {
          pauseReason = 'storage_limit_reached';
          queueIndex--;
          return;
        }

        reservedBatchSize += manifest.estimatedSizeBytes;
        emitPhase3Progress();
        await processBook(manifest, queuePosition);
      }
    };

    const workerCount = Math.min(concurrencyLimit, manifestWithUrls.length || 1);
    const workerPromises = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workerPromises);

    if (cancelSignal.cancelled) {
      repo.updateBatch(db, batchId, {
        status: 'cancelled',
        completed_at: now(),
        books_downloaded: booksCompleted,
        total_size_bytes: currentBatchSize
      });
      emitProgress({
        status: 'cancelled',
        activeWorkers: 0,
        booksActive: 0,
        booksQueued: Math.max(0, manifestWithUrls.length - queueIndex),
        activeBooks: []
      });
      return { status: 'cancelled', booksCompleted, totalSizeBytes: currentBatchSize };
    }

    if (pauseReason) {
      repo.updateBatch(db, batchId, {
        status: 'paused',
        completed_at: now(),
        books_downloaded: booksCompleted,
        total_size_bytes: currentBatchSize,
        config_json: JSON.stringify({
          bookIds,
          maxSizeBytes,
          maxConcurrentBooks: concurrencyLimit,
          duplicatePolicy: 'skip_completed',
          pauseReason
        })
      });
      emitProgress({
        status: 'paused',
        phaseLabel: 'Paused: storage limit reached',
        activeWorkers: 0,
        booksActive: 0,
        booksQueued: Math.max(0, manifestWithUrls.length - queueIndex),
        activeBooks: []
      });
      return {
        status: 'paused',
        booksCompleted,
        totalSizeBytes: currentBatchSize,
        error: 'Storage limit reached'
      };
    }

    const batchRow = repo.getBatchById(db, batchId);
    const durationSeconds = batchRow ? Math.round((Date.now() - new Date(batchRow.started_at).getTime()) / 1000) : 0;
    repo.updateBatch(db, batchId, {
      status: 'completed',
      completed_at: now(),
      books_downloaded: booksCompleted,
      total_size_bytes: currentBatchSize,
      duration_seconds: durationSeconds
    });
    emitProgress({
      status: 'completed',
      phaseLabel: 'Download complete',
      booksCompleted,
      booksFailed,
      booksQueued: 0,
      booksActive: 0,
      activeWorkers: 0,
      activeBooks: [],
      totalSizeBytes: currentBatchSize
    });

    return {
      status: 'completed',
      booksCompleted,
      totalSizeBytes: currentBatchSize
    };
  } catch (err) {
    repo.updateBatch(db, batchId, { status: 'failed', completed_at: now() });
    throw err;
  }
}

module.exports = {
  run,
  slugify,
  buildManifestEntry,
  DEFAULT_MAX_SIZE_BYTES,
  DEFAULT_MAX_CONCURRENT_BOOKS
};
