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
    bookIds,
    batchId,
    cancelSignal = { cancelled: false },
    onProgress = () => {}
  } = options;

  const emitProgress = (overrides = {}) => {
    onProgress({
      batchId,
      ...overrides
    });
  };

  const basePath = path.resolve(baseFolderPath);
  const configJson = JSON.stringify({
    bookIds,
    maxSizeBytes,
    duplicatePolicy: 'skip_completed',
    pauseReason: null
  });

  const now = () => new Date().toISOString();

  try {
    repo.createBatch(db, {
      id: batchId,
      base_folder_path: basePath,
      max_size_bytes: maxSizeBytes,
      config_json: configJson
    });

    emitProgress({ phase: 1, phaseLabel: 'Creating folder structure' });

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
        bookTitle: book.title
      });
    }

    emitProgress({
      phase: 3,
      phaseLabel: 'Downloading MP3s',
      bookTotal: manifestWithUrls.length
    });

    // Phase 3: Download MP3s
    let currentBatchSize = 0;
    let booksCompleted = 0;

    for (let i = 0; i < manifestWithUrls.length; i++) {
      if (cancelSignal.cancelled) {
        repo.updateBatch(db, batchId, {
          status: 'cancelled',
          completed_at: now(),
          books_downloaded: booksCompleted,
          total_size_bytes: currentBatchSize
        });
        return { status: 'cancelled', booksCompleted, totalSizeBytes: currentBatchSize };
      }

      const { book, partUrls, estimatedSizeBytes, partCount } = manifestWithUrls[i];
      const slug = slugify(book.title);
      const folderName = `${book.id}_${slug}`;
      const bookFolder = path.join(basePath, folderName);

      if (currentBatchSize + estimatedSizeBytes > maxSizeBytes) {
        repo.updateBatch(db, batchId, {
          status: 'paused',
          completed_at: now(),
          books_downloaded: booksCompleted,
          total_size_bytes: currentBatchSize,
          config_json: JSON.stringify({
            bookIds,
            maxSizeBytes,
            duplicatePolicy: 'skip_completed',
            pauseReason: 'storage_limit_reached'
          })
        });
        return {
          status: 'paused',
          booksCompleted,
          totalSizeBytes: currentBatchSize,
          error: 'Storage limit reached'
        };
      }

      const downloadedBook = repo.getDownloadedBookByBatchAndBook(db, batchId, book.id);
      if (!downloadedBook) continue;

      if (partUrls.length === 0) {
        repo.updateDownloadedBook(db, downloadedBook.id, {
          status: 'failed',
          completed_at: now(),
          error_message: 'No valid download URLs'
        });
        continue;
      }

      repo.updateDownloadedBook(db, downloadedBook.id, {
        status: 'in_progress',
        started_at: now()
      });

      emitProgress({
        phase: 3,
        phaseLabel: `Downloading book ${i + 1} of ${manifestWithUrls.length}`,
        bookIndex: i,
        bookTotal: manifestWithUrls.length,
        bookTitle: book.title,
        partTotal: partCount,
        booksCompleted,
        totalSizeBytes: currentBatchSize
      });

      let bookTotalBytes = 0;
      let partsDownloaded = 0;
      let bookFailed = false;
      let bookError = null;

      for (let p = 0; p < partUrls.length; p++) {
        if (cancelSignal.cancelled) break;
        const url = partUrls[p];
        const partNum = String(p + 1).padStart(3, '0');
        const destPath = path.join(bookFolder, `part_${partNum}.mp3`);

        emitProgress({
          phase: 3,
          bookIndex: i,
          bookTotal: manifestWithUrls.length,
          partIndex: p,
          partTotal: partCount,
          bookTitle: book.title
        });

        try {
          const bytes = await downloadUrlToFile(url, destPath);
          bookTotalBytes += bytes;
          partsDownloaded++;
          currentBatchSize += bytes;

          repo.updateDownloadedBook(db, downloadedBook.id, {
            parts_downloaded: partsDownloaded,
            total_size_bytes: bookTotalBytes
          });

          repo.updateBatch(db, batchId, {
            books_downloaded: booksCompleted + (partsDownloaded === partCount ? 1 : 0),
            total_size_bytes: currentBatchSize
          });
        } catch (err) {
          bookFailed = true;
          bookError = err.message;
          console.error(`[batch ${batchId}] Book ${book.id} part ${p + 1} failed:`, err.message);
          break;
        }
      }

      if (bookFailed) {
        repo.updateDownloadedBook(db, downloadedBook.id, {
          status: 'failed',
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
  DEFAULT_MAX_SIZE_BYTES
};
