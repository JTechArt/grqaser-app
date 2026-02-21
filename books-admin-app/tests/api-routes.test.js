/**
 * API route tests: books, stats, crawler, health.
 * Story 5.1 — main API routes and health check.
 */

const request = require('supertest');
const Database = require('better-sqlite3');
const { setup } = require('./setup');

process.env.NODE_ENV = 'test';

let app;

function seedBooksForApiTest(dbPath) {
  const db = new Database(dbPath);
  const now = new Date().toISOString();
  db.prepare(
    `INSERT OR REPLACE INTO books (id, title, author, description, crawl_status, category, language, duration, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(1, 'First Audiobook', 'Author Alpha', 'Desc one', 'completed', 'Fiction', 'hy', 3600, now, now);
  db.prepare(
    `INSERT OR REPLACE INTO books (id, title, author, crawl_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(2, 'Second Book', 'Author Beta', 'discovered', now, now);
  db.close();
}

beforeAll(async () => {
  const testDbPath = await setup();
  if (!global.__booksAdminApp) {
    process.env.DB_PATH = testDbPath;
    const server = require('../src/server');
    await server.startServer();
    global.__booksAdminApp = server;
  }
  app = global.__booksAdminApp;
  seedBooksForApiTest(testDbPath);
});

describe('GET /api/v1/health', () => {
  it('returns 200 and reflects DB connectivity', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.database).toBe('connected');
    expect(res.body.data.timestamp).toBeDefined();
    expect(res.body.data.uptime).toBeDefined();
  });
});

describe('GET /api/v1/books', () => {
  it('returns 200 and paginated books', async () => {
    const res = await request(app)
      .get('/api/v1/books')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.books)).toBe(true);
    expect(res.body.data.books.length).toBeGreaterThanOrEqual(0);
  });

  it('accepts page and limit query params', async () => {
    const res = await request(app)
      .get('/api/v1/books?page=1&limit=5')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.books.length).toBeLessThanOrEqual(5);
  });
});

describe('GET /api/v1/books/search', () => {
  it('returns 400 when q is missing', async () => {
    const res = await request(app)
      .get('/api/v1/books/search')
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MISSING_QUERY');
  });

  it('returns 200 and results when q provided', async () => {
    const res = await request(app)
      .get('/api/v1/books/search?q=First')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.books)).toBe(true);
  });
});

describe('GET /api/v1/books/:id', () => {
  it('returns 200 and book when id exists', async () => {
    const res = await request(app)
      .get('/api/v1/books/1')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.title).toBeDefined();
    expect(res.body.data.author).toBeDefined();
  });

  it('returns 404 when book not found', async () => {
    const res = await request(app)
      .get('/api/v1/books/99999')
      .expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BOOK_NOT_FOUND');
  });
});

describe('PATCH /api/v1/books/:id', () => {
  it('returns 200 and updated book for valid patch', async () => {
    const res = await request(app)
      .patch('/api/v1/books/1')
      .set('Content-Type', 'application/json')
      .send({ description: 'Updated description' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.description).toBe('Updated description');
  });

  it('returns 404 when book not found', async () => {
    await request(app)
      .patch('/api/v1/books/99999')
      .set('Content-Type', 'application/json')
      .send({ title: 'No' })
      .expect(404);
  });
});

describe('GET /api/v1/stats/overview', () => {
  it('returns 200 and crawl stats', async () => {
    const res = await request(app)
      .get('/api/v1/stats/overview')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.totalBooks).toBe('number');
  });
});

describe('GET /api/v1/stats/authors', () => {
  it('returns 200 and authors list', async () => {
    const res = await request(app)
      .get('/api/v1/stats/authors')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.authors).toBeDefined();
    expect(Array.isArray(res.body.data.authors)).toBe(true);
  });
});

describe('GET /api/v1/stats/categories', () => {
  it('returns 200 and categories list', async () => {
    const res = await request(app)
      .get('/api/v1/stats/categories')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.categories).toBeDefined();
    expect(Array.isArray(res.body.data.categories)).toBe(true);
  });
});

describe('GET /api/v1/crawler/status', () => {
  it('returns 200 and status object', async () => {
    const res = await request(app)
      .get('/api/v1/crawler/status')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.is_running).toBe('boolean');
    expect(typeof res.body.data.total_books).toBe('number');
  });
});

describe('GET /api/v1/crawler/config', () => {
  it('returns 200 and config object', async () => {
    const res = await request(app)
      .get('/api/v1/crawler/config')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.mode).toBeDefined();
    expect(res.body.data.dbPath).toBeDefined();
  });
});
