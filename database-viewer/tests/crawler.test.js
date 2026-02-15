/**
 * Crawler API route tests (AC1).
 * /api/v1/crawler/status, /urls, /logs — structure and integration with DB.
 */
const request = require('supertest');
const { setup } = require('./setup');

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
});

describe('GET /api/v1/crawler/status', () => {
  it('returns 200 and crawler status shape', async () => {
    const res = await request(app)
      .get('/api/v1/crawler/status')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.is_running).toBe('boolean');
    expect(typeof res.body.data.total_books).toBe('number');
    expect(typeof res.body.data.discovered_books).toBe('number');
    expect(typeof res.body.data.processed_books).toBe('number');
    expect(typeof res.body.data.failed_books).toBe('number');
    expect(typeof res.body.data.pending_urls).toBe('number');
    expect(typeof res.body.data.processing_urls).toBe('number');
    expect(typeof res.body.data.completed_urls).toBe('number');
    expect(typeof res.body.data.failed_urls).toBe('number');
  });
});

describe('GET /api/v1/crawler/urls', () => {
  it('returns 200 and url queue with summary', async () => {
    const res = await request(app)
      .get('/api/v1/crawler/urls')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.urls)).toBe(true);
    expect(res.body.data.summary).toBeDefined();
  });

  it('accepts optional status query and filters urls', async () => {
    const res = await request(app)
      .get('/api/v1/crawler/urls?status=pending')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.urls)).toBe(true);
  });
});

describe('GET /api/v1/crawler/logs', () => {
  it('returns 200 and logs with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/crawler/logs')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.logs)).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
    expect(typeof res.body.data.pagination.page).toBe('number');
    expect(typeof res.body.data.pagination.limit).toBe('number');
    expect(typeof res.body.data.pagination.total).toBe('number');
  });

  it('accepts page, limit, level, book_id query params', async () => {
    const res = await request(app)
      .get('/api/v1/crawler/logs?page=1&limit=5&level=info')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pagination.limit).toBe(5);
  });
});
