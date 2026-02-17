/**
 * Stats API tests (Story 2.1, AC4).
 * GET /api/v1/stats/overview, /authors, /categories — counts/aggregates.
 */
const request = require('supertest');
const { setup } = require('./setup');
const { seedBooks } = require('./create-test-db');

process.env.NODE_ENV = 'test';

let app;

beforeAll(async () => {
  await setup();
  if (!global.__databaseViewerApp) {
    process.env.DB_PATH = process.env.TEST_DB_PATH;
    const server = require('../src/server');
    await server.startServer();
    global.__databaseViewerApp = server;
  }
  app = global.__databaseViewerApp;
  await seedBooks(app.db);
});

describe('GET /api/v1/stats/overview', () => {
  it('returns 200 and overview stats', async () => {
    const res = await request(app)
      .get('/api/v1/stats/overview')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.totalBooks).toBe('number');
    expect(Array.isArray(res.body.data.booksByStatus)).toBe(true);
    expect(Array.isArray(res.body.data.booksByCategory)).toBe(true);
    expect(Array.isArray(res.body.data.booksByLanguage)).toBe(true);
    expect(res.body.data.duration).toBeDefined();
    expect(typeof res.body.data.duration.total).toBe('number');
  });

  it('totalBooks matches seeded data', async () => {
    const res = await request(app).get('/api/v1/stats/overview').expect(200);
    expect(res.body.data.totalBooks).toBe(3);
  });
});

describe('GET /api/v1/stats/authors', () => {
  it('returns 200 and authors with counts', async () => {
    const res = await request(app)
      .get('/api/v1/stats/authors')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.authors).toBeDefined();
    expect(Array.isArray(res.body.data.authors)).toBe(true);
    res.body.data.authors.forEach((row) => {
      expect(row.author).toBeDefined();
      expect(typeof row.book_count).toBe('number');
    });
  });

  it('author counts are consistent with schema', async () => {
    const res = await request(app).get('/api/v1/stats/authors').expect(200);
    const authors = res.body.data.authors;
    expect(authors.length).toBeGreaterThanOrEqual(1);
    const alpha = authors.find((a) => a.author === 'Author Alpha');
    expect(alpha).toBeDefined();
    expect(alpha.book_count).toBe(2);
  });
});

describe('GET /api/v1/stats/categories', () => {
  it('returns 200 and categories with counts', async () => {
    const res = await request(app)
      .get('/api/v1/stats/categories')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.categories).toBeDefined();
    expect(Array.isArray(res.body.data.categories)).toBe(true);
    res.body.data.categories.forEach((row) => {
      expect(row.category).toBeDefined();
      expect(typeof row.book_count).toBe('number');
    });
  });

  it('category counts and total_duration are consistent', async () => {
    const res = await request(app).get('/api/v1/stats/categories').expect(200);
    const categories = res.body.data.categories;
    expect(categories.length).toBeGreaterThanOrEqual(1);
    const fiction = categories.find((c) => c.category === 'Fiction');
    expect(fiction).toBeDefined();
    expect(fiction.book_count).toBe(2);
    expect(typeof fiction.total_duration).toBe('number');
  });
});
