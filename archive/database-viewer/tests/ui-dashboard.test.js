/**
 * UI dashboard tests (Story 2.3, AC1).
 * Dashboard is served from public/index.html; stats API powers the view.
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

describe('Dashboard UI (Story 2.3)', () => {
  it('GET / serves index.html with dashboard content', async () => {
    const res = await request(app)
      .get('/')
      .expect(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('Grqaser Database Viewer');
    expect(res.text).toContain('statsGrid');
    expect(res.text).toContain('Total Books');
    expect(res.text).toContain('totalBooks');
  });

  it('stats API used by dashboard returns overview data', async () => {
    const res = await request(app)
      .get('/api/v1/stats/overview')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.totalBooks).toBe('number');
    expect(Array.isArray(res.body.data.booksByStatus)).toBe(true);
  });

  it('UI includes crawler view and nav (AC3)', async () => {
    const res = await request(app).get('/').expect(200);
    expect(res.text).toContain('view-crawler');
    expect(res.text).toContain('Crawler');
    expect(res.text).toContain('crawlerStatusGrid');
    expect(res.text).toContain('crawlerLogsList');
  });

  it('GET / returns books view markup for AC2 traceability', async () => {
    const res = await request(app).get('/').expect(200);
    expect(res.text).toContain('view-books');
    expect(res.text).toContain('booksList');
  });
});
