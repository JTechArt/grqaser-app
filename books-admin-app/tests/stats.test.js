/**
 * Stats API tests. GET /api/v1/stats/overview, /authors, /categories.
 * Addresses QA TEST-001 (stats route coverage).
 */
const request = require('supertest');
const { setup } = require('./setup');
const { seedBooks } = require('./create-test-db');

process.env.NODE_ENV = 'test';

let app;

beforeAll(async () => {
  await setup();
  if (!global.__booksAdminApp) {
    process.env.DB_PATH = process.env.TEST_DB_PATH;
    const server = require('../src/server');
    await server.startServer();
    global.__booksAdminApp = server;
  }
  app = global.__booksAdminApp;
  await seedBooks(app.db);
});

describe('GET /api/v1/stats/overview', () => {
  it('returns 200 and overview stats with expected shape', async () => {
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
    expect(Array.isArray(res.body.data.recentActivity)).toBe(true);
  });
});

describe('GET /api/v1/stats/authors', () => {
  it('returns 200 and authors array with expected shape', async () => {
    const res = await request(app)
      .get('/api/v1/stats/authors')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.authors).toBeDefined();
    expect(Array.isArray(res.body.data.authors)).toBe(true);
    if (res.body.data.authors.length > 0) {
      const author = res.body.data.authors[0];
      expect(author.author).toBeDefined();
      expect(typeof author.book_count).toBe('number');
    }
  });
});

describe('GET /api/v1/stats/categories', () => {
  it('returns 200 and categories array with expected shape', async () => {
    const res = await request(app)
      .get('/api/v1/stats/categories')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.categories).toBeDefined();
    expect(Array.isArray(res.body.data.categories)).toBe(true);
    if (res.body.data.categories.length > 0) {
      const cat = res.body.data.categories[0];
      expect(cat.category).toBeDefined();
      expect(typeof cat.book_count).toBe('number');
    }
  });
});
