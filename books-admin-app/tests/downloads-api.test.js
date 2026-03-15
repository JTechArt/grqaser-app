/**
 * Integration tests for downloads API (Epic 12).
 * Story 12.3: API endpoints for batch control and history.
 */

const request = require('supertest');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { setup } = require('./setup');
const migration002 = require('../src/migrations/002-admin-download-tables');

process.env.NODE_ENV = 'test';

let app;
let testDbPath;
let downloadBasePath;

function ensureMigration002(dbPath) {
  const db = new Database(dbPath);
  try {
    migration002.up(db);
  } finally {
    db.close();
  }
}

function seedBooksWithUrls(dbPath) {
  const db = new Database(dbPath);
  const now = new Date().toISOString();
  db.prepare(`INSERT OR IGNORE INTO authors (id, name) VALUES (?, ?)`).run(1, 'Author Alpha');
  db.prepare(`INSERT OR IGNORE INTO authors (id, name) VALUES (?, ?)`).run(2, 'Author Beta');
  db.prepare(`INSERT OR IGNORE INTO book_categories (id, name) VALUES (?, ?)`).run(1, 'Fiction');
  db.prepare(`INSERT OR IGNORE INTO book_categories (id, name) VALUES (?, ?)`).run(2, 'Non-Fiction');
  db.prepare(
    `INSERT OR REPLACE INTO books (id, title, author, author_id, description, crawl_status, category, category_id, language, duration, duration_formatted, main_audio_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(1, 'First Audiobook', 'Author Alpha', 1, 'Desc one', 'completed', 'Fiction', 1, 'hy', 3600, '60m', 'https://example.com/audio1.mp3', now, now);
  db.prepare(
    `INSERT OR REPLACE INTO books (id, title, author, author_id, crawl_status, category, category_id, duration, duration_formatted, main_audio_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(2, 'Second Book', 'Author Beta', 2, 'completed', 'Non-Fiction', 2, 4800, '80m', 'https://example.com/audio2.mp3', now, now);
  db.close();
}

beforeAll(async () => {
  testDbPath = await setup();
  ensureMigration002(testDbPath);
  seedBooksWithUrls(testDbPath);

  downloadBasePath = path.join(os.tmpdir(), 'grqaser-downloads-test-' + Date.now());
  fs.mkdirSync(downloadBasePath, { recursive: true });

  if (!global.__booksAdminApp) {
    process.env.DB_PATH = testDbPath;
    const server = require('../src/server');
    await server.startServer();
    global.__booksAdminApp = server;
  }
  app = global.__booksAdminApp;
});

afterAll(() => {
  if (downloadBasePath && fs.existsSync(downloadBasePath)) {
    try {
      fs.rmSync(downloadBasePath, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  }
});

describe('POST /api/v1/downloads/start', () => {
  it('returns 400 when base_folder_path is missing', async () => {
    const res = await request(app)
      .post('/api/v1/downloads/start')
      .send({})
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MISSING_BASE_FOLDER');
  });

  it('returns 400 when base_folder_path is not a string', async () => {
    const res = await request(app)
      .post('/api/v1/downloads/start')
      .send({ base_folder_path: 123 })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 202 and batch_id when valid', async () => {
    const res = await request(app)
      .post('/api/v1/downloads/start')
      .send({
        base_folder_path: downloadBasePath,
        book_ids: [1, 2]
      })
      .expect(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.batch_id).toMatch(/^batch-/);
    expect(res.body.data.book_count).toBe(2);
  });

  it('returns 409 when a batch is already running', async () => {
    // Wait for any prior batch (from previous test) to complete
    for (let i = 0; i < 50; i++) {
      const s = await request(app).get('/api/v1/downloads/status').expect(200);
      if (!s.body.data?.running) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    // Fire both requests simultaneously; one must get 202, the other 409
    const [res1, res2] = await Promise.all([
      request(app).post('/api/v1/downloads/start').send({
        base_folder_path: downloadBasePath,
        book_ids: [1, 2]
      }),
      request(app).post('/api/v1/downloads/start').send({
        base_folder_path: downloadBasePath,
        book_ids: [1]
      })
    ]);
    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(202);
    expect(statuses).toContain(409);
    const conflictRes = res1.status === 409 ? res1 : res2;
    expect(conflictRes.body.success).toBe(false);
    expect(conflictRes.body.error.code).toBe('BATCH_ALREADY_RUNNING');
  });
});

describe('GET /api/v1/downloads/status', () => {
  it('returns 200 and status data', async () => {
    const res = await request(app)
      .get('/api/v1/downloads/status')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.running).toBe('boolean');
    expect(typeof res.body.data.active_workers).toBe('number');
    expect(typeof res.body.data.concurrency_limit).toBe('number');
    expect(Array.isArray(res.body.data.active_books)).toBe(true);
  });
});

describe('GET /api/v1/downloads/batches', () => {
  it('returns 200 and batches array', async () => {
    const res = await request(app)
      .get('/api/v1/downloads/batches')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.batches)).toBe(true);
  });
});

describe('GET /api/v1/downloads/batches/:batchId', () => {
  it('returns 404 for non-existent batch', async () => {
    const res = await request(app)
      .get('/api/v1/downloads/batches/batch-nonexistent-12345')
      .expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BATCH_NOT_FOUND');
  });

  it('returns 200 and batch detail when batch exists', async () => {
    // Wait for the batch we started to complete (or at least be in DB)
    await new Promise((r) => setTimeout(r, 2000));

    const listRes = await request(app).get('/api/v1/downloads/batches').expect(200);
    const batches = listRes.body.data.batches;
    if (batches.length > 0) {
      const batchId = batches[0].id;
      const res = await request(app)
        .get(`/api/v1/downloads/batches/${batchId}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(batchId);
      expect(res.body.data.base_folder_path).toBeDefined();
      expect(res.body.data.status).toBeDefined();
      expect(Array.isArray(res.body.data.books)).toBe(true);
    }
  });
});

describe('POST /api/v1/downloads/:batchId/cancel', () => {
  it('returns 404 when batch is not running', async () => {
    const res = await request(app)
      .post('/api/v1/downloads/batch-nonexistent/cancel')
      .expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BATCH_NOT_RUNNING');
  });
});

describe('POST /api/v1/downloads/:batchId/stop', () => {
  it('returns 404 when batch is not running', async () => {
    const res = await request(app)
      .post('/api/v1/downloads/batch-nonexistent/stop')
      .expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BATCH_NOT_RUNNING');
  });
});
