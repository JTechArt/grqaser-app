/**
 * Tests for download pipeline service (Epic 12)
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  slugify,
  buildManifestEntry,
  run,
  DEFAULT_MAX_SIZE_BYTES,
  DEFAULT_MAX_CONCURRENT_BOOKS
} = require('../src/services/download-pipeline');
const migration = require('../src/migrations/002-admin-download-tables');
const { CREATE_BOOKS_TABLE_SQL } = require('../src/crawler/schema/books-table');
const { CREATE_AUTHORS_TABLE_SQL } = require('../src/crawler/schema/authors-table');
const { CREATE_BOOK_CATEGORIES_TABLE_SQL } = require('../src/crawler/schema/book-categories-table');

const MINIMAL_BOOKS = `
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY,
    title VARCHAR(500),
    author VARCHAR(200),
    description TEXT,
    duration INTEGER,
    duration_formatted TEXT,
    main_audio_url TEXT,
    chapter_urls TEXT,
    chapter_count INTEGER,
    has_chapters INTEGER,
    file_size INTEGER,
    category VARCHAR(100),
    language VARCHAR(10),
    published_at TEXT,
    cover_image_url TEXT
  )
`;

function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `pipeline-test-${Date.now()}.db`);
  const db = new Database(dbPath);
  db.exec(CREATE_AUTHORS_TABLE_SQL);
  db.exec(CREATE_BOOK_CATEGORIES_TABLE_SQL);
  db.exec(CREATE_BOOKS_TABLE_SQL);
  migration.up(db);
  return { db, dbPath };
}

describe('Download pipeline', () => {
  describe('slugify', () => {
    test('sanitizes title for folder name', () => {
      expect(slugify('My Book Title')).toBe('my-book-title');
    });
    test('removes invalid path chars', () => {
      expect(slugify('Book/With:Invalid*Chars')).toBe('bookwithinvalidchars');
    });
    test('handles empty or null', () => {
      expect(slugify('')).toBe('book');
      expect(slugify(null)).toBe('book');
      expect(slugify(undefined)).toBe('book');
    });
    test('collapses spaces and hyphens', () => {
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
    });
  });

  describe('buildManifestEntry', () => {
    test('single-file book uses main_audio_url', () => {
      const book = {
        id: 1,
        title: 'Test',
        author: 'Author',
        main_audio_url: 'https://example.com/audio.mp3',
        chapter_urls: null,
        duration: 60,
        file_size: 5000000
      };
      const m = buildManifestEntry(book);
      expect(m.partUrls).toHaveLength(1);
      expect(m.partUrls[0]).toBe('https://example.com/audio.mp3');
      expect(m.partCount).toBe(1);
      expect(m.estimatedSizeBytes).toBe(5000000);
      expect(m.metadata.download_links).toHaveLength(1);
    });
    test('multi-chapter book uses chapter_urls', () => {
      const book = {
        id: 2,
        title: 'Chapters',
        author: 'Author',
        main_audio_url: null,
        chapter_urls: JSON.stringify(['https://a.com/1.mp3', 'https://a.com/2.mp3']),
        duration: 120,
        file_size: null
      };
      const m = buildManifestEntry(book);
      expect(m.partUrls).toHaveLength(2);
      expect(m.partCount).toBe(2);
      expect(m.estimatedSizeBytes).toBe(120 * 1024 * 1024); // ~1MB/min
    });
    test('metadata has required fields', () => {
      const book = {
        id: 3,
        title: 'Meta',
        author: 'A',
        description: 'Desc',
        duration: 30,
        duration_formatted: '30m',
        main_audio_url: 'https://example.com/a.mp3',
        category: 'Fiction',
        language: 'en',
        cover_image_url: 'https://example.com/cover.jpg'
      };
      const m = buildManifestEntry(book);
      expect(m.metadata.id).toBe(3);
      expect(m.metadata.title).toBe('Meta');
      expect(m.metadata.author).toBe('A');
      expect(m.metadata.duration_minutes).toBe(30);
      expect(m.metadata.grqaser_url).toContain('/book/3');
      expect(m.metadata.download_links).toBeDefined();
    });
  });

  describe('DEFAULT_MAX_SIZE_BYTES', () => {
    test('equals 200GB', () => {
      expect(DEFAULT_MAX_SIZE_BYTES).toBe(200 * 1024 * 1024 * 1024);
    });
  });

  describe('DEFAULT_MAX_CONCURRENT_BOOKS', () => {
    test('caps concurrency at 10 books', () => {
      expect(DEFAULT_MAX_CONCURRENT_BOOKS).toBe(10);
    });
  });

  describe('run pipeline', () => {
    let db;
    let dbPath;
    let basePath;

    beforeEach(() => {
      const setup = createTestDb();
      db = setup.db;
      dbPath = setup.dbPath;
      basePath = path.join(os.tmpdir(), `pipeline-run-${Date.now()}`);
      fs.mkdirSync(basePath, { recursive: true });

      db.prepare(`
        INSERT INTO books (id, title, author, main_audio_url, duration, duration_formatted)
        VALUES (1, 'Book One', 'Author A', 'https://httpbin.org/bytes/100', 10, '10m'),
               (2, 'Book Two', 'Author B', 'https://httpbin.org/bytes/200', 20, '20m')
      `).run();
    });

    afterEach(() => {
      db.close();
      try {
        fs.unlinkSync(dbPath);
      } catch {}
      try {
        fs.rmSync(basePath, { recursive: true, force: true });
      } catch {}
    });

    test('Phase 1 creates base folder and validates write', async () => {
      const batchId = 'batch-test-' + Date.now();
      const progressEvents = [];
      const result = await run({
        db,
        baseFolderPath: basePath,
        maxSizeBytes: 1024 * 1024 * 1024,
        bookIds: [1, 2],
        batchId,
        onProgress: (p) => progressEvents.push(p)
      });

      expect(progressEvents.some((e) => e.phase === 1)).toBe(true);
      expect(fs.existsSync(basePath)).toBe(true);
    });

    test('Phase 2 creates book folders and metadata.json', async () => {
      const batchId = 'batch-meta-' + Date.now();
      await run({
        db,
        baseFolderPath: basePath,
        maxSizeBytes: 1024 * 1024 * 1024 * 100,
        bookIds: [1, 2],
        batchId
      });

      const book1Folder = path.join(basePath, '1_book-one');
      const book2Folder = path.join(basePath, '2_book-two');
      expect(fs.existsSync(book1Folder)).toBe(true);
      expect(fs.existsSync(book2Folder)).toBe(true);

      const meta1 = JSON.parse(fs.readFileSync(path.join(book1Folder, 'metadata.json'), 'utf8'));
      expect(meta1.id).toBe(1);
      expect(meta1.title).toBe('Book One');
      expect(meta1.author).toBe('Author A');
      expect(meta1.download_links).toBeDefined();
    });

    test('Phase 2 skips books with no valid URLs', async () => {
      db.prepare(
        `INSERT INTO books (id, title, author, main_audio_url, duration, duration_formatted)
         VALUES (3, 'No URL Book', 'Author C', null, 10, '10m')`
      ).run();

      const batchId = 'batch-skip-' + Date.now();
      await run({
        db,
        baseFolderPath: basePath,
        maxSizeBytes: 1024 * 1024 * 1024 * 100,
        bookIds: [1, 2, 3],
        batchId
      });

      const book1Folder = path.join(basePath, '1_book-one');
      const book2Folder = path.join(basePath, '2_book-two');
      const book3Folder = path.join(basePath, '3_no-url-book');
      expect(fs.existsSync(book1Folder)).toBe(true);
      expect(fs.existsSync(book2Folder)).toBe(true);
      expect(fs.existsSync(book3Folder)).toBe(false);
    });

    test('respects cancel signal', async () => {
      const batchId = 'batch-cancel-' + Date.now();
      const cancelSignal = { cancelled: false };
      const runPromise = run({
        db,
        baseFolderPath: basePath,
        maxSizeBytes: 1024 * 1024 * 1024 * 100,
        bookIds: [1, 2],
        batchId,
        cancelSignal
      });

      cancelSignal.cancelled = true;
      const result = await runPromise;
      expect(result.status).toBe('cancelled');
    });

    test('auto-pauses when storage limit would be exceeded', async () => {
      const batchId = 'batch-limit-' + Date.now();
      const result = await run({
        db,
        baseFolderPath: basePath,
        maxSizeBytes: 50,
        bookIds: [1],
        batchId
      });

      expect(result.status).toBe('paused');
      expect(result.error).toContain('Storage limit');
    });

    test('downloads at most 10 books concurrently and starts next queued book when one finishes', async () => {
      db.prepare('DELETE FROM books').run();

      const values = [];
      const placeholders = [];
      for (let i = 1; i <= 12; i++) {
        placeholders.push('(?, ?, ?, ?, ?, ?)');
        values.push(i, `Book ${i}`, `Author ${i}`, `https://example.com/${i}.mp3`, 10, '10m');
      }
      db.prepare(`
        INSERT INTO books (id, title, author, main_audio_url, duration, duration_formatted)
        VALUES ${placeholders.join(', ')}
      `).run(...values);

      let inFlight = 0;
      let peakInFlight = 0;
      const progressEvents = [];

      const result = await run({
        db,
        baseFolderPath: basePath,
        maxSizeBytes: 1024 * 1024 * 1024 * 100,
        bookIds: Array.from({ length: 12 }, (_, index) => index + 1),
        batchId: 'batch-concurrency-' + Date.now(),
        downloadImpl: async (_url, destPath) => {
          inFlight++;
          peakInFlight = Math.max(peakInFlight, inFlight);
          await new Promise((resolve) => setTimeout(resolve, 25));
          fs.writeFileSync(destPath, 'ok');
          inFlight--;
          return 2;
        },
        onProgress: (progress) => progressEvents.push(progress)
      });

      expect(result.status).toBe('completed');
      expect(result.booksCompleted).toBe(12);
      expect(peakInFlight).toBeLessThanOrEqual(10);
      expect(progressEvents.some((event) => event.activeWorkers === 10)).toBe(true);
      expect(progressEvents.some((event) => event.booksQueued > 0)).toBe(true);
    });
  });
});
