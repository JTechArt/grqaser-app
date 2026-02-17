/**
 * Crawler API tests. GET /api/v1/crawler/status, /urls, /logs.
 * Addresses QA TEST-001 (crawler route coverage).
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

describe('GET /api/v1/crawler/status', () => {
  it('returns 200 and status object with expected shape', async () => {
    const res = await request(app)
      .get('/api/v1/crawler/status')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.total_books).toBe('number');
    expect(typeof res.body.data.processed_books).toBe('number');
    expect(typeof res.body.data.discovered_books).toBe('number');
    expect(typeof res.body.data.failed_books).toBe('number');
    expect(typeof res.body.data.pending_urls).toBe('number');
    expect(typeof res.body.data.completed_urls).toBe('number');
    expect(typeof res.body.data.failed_urls).toBe('number');
    expect(typeof res.body.data.is_running).toBe('boolean');
  });
});

describe('GET /api/v1/crawler/urls', () => {
  it('returns 200 and urls/summary with expected shape', async () => {
    const res = await request(app)
      .get('/api/v1/crawler/urls')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.urls).toBeDefined();
    expect(Array.isArray(res.body.data.urls)).toBe(true);
    expect(res.body.data.summary).toBeDefined();
    expect(typeof res.body.data.summary).toBe('object');
  });

  it('accepts status query and filters urls', async () => {
    const res = await request(app)
      .get('/api/v1/crawler/urls?status=pending')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.urls)).toBe(true);
    res.body.data.urls.forEach((url) => {
      expect(url.status).toBe('pending');
    });
  });
});

describe('GET /api/v1/crawler/logs', () => {
  it('returns 200 and logs with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/crawler/logs')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toBeDefined();
    expect(Array.isArray(res.body.data.logs)).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
    expect(typeof res.body.data.pagination.page).toBe('number');
    expect(typeof res.body.data.pagination.total).toBe('number');
    expect(typeof res.body.data.pagination.pages).toBe('number');
  });

  it('accepts page and limit query params', async () => {
    const res = await request(app)
      .get('/api/v1/crawler/logs?page=1&limit=5')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs.length).toBeLessThanOrEqual(5);
    expect(res.body.data.pagination.limit).toBe(5);
  });
});
