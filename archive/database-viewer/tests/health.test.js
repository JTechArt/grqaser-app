/**
 * Health endpoint tests (AC2).
 * GET /api/v1/health returns service health and DB connectivity;
 * 200 when DB reachable, 503 when not.
 */
const request = require('supertest');
const { createTestDb, getTestDbPath } = require('./create-test-db');
const { setup } = require('./setup');

process.env.NODE_ENV = 'test';

let app;

beforeAll(async () => {
  const testDbPath = await setup();
  if (!global.__databaseViewerApp) {
    process.env.DB_PATH = testDbPath;
    const server = require('../src/server');
    await server.startServer();
    global.__databaseViewerApp = server;
  }
  app = global.__databaseViewerApp;
});

describe('GET /api/v1/health', () => {
  it('returns 200 and database connected when DB is reachable', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.database).toBe('connected');
    expect(res.body.data.timestamp).toBeDefined();
    expect(res.body.data.uptime).toBeGreaterThanOrEqual(0);
  });

  it('returns JSON with version and uptime', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);
    expect(res.body.data.version).toBe('1.0.0');
    expect(typeof res.body.data.uptime).toBe('number');
  });
});

describe('GET /api/v1/health when DB is not connected', () => {
  it('returns 503 and database disconnected', async () => {
    let appNoDb;
    jest.isolateModules(() => {
      process.env.DB_PATH = getTestDbPath();
      appNoDb = require('../src/server');
    });
    const res = await request(appNoDb)
      .get('/api/v1/health')
      .expect(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.database).toBe('disconnected');
  });
});
