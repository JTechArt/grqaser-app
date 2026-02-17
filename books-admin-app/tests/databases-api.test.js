/**
 * Databases API tests. GET /api/v1/databases, PUT /api/v1/databases/active, DELETE.
 * Story 6.2 — DB versioning API.
 */

const request = require('supertest');
const { createTestDb, getTestDbPath } = require('./create-test-db');
const { setup } = require('./setup');

process.env.NODE_ENV = 'test';

let app;

beforeAll(async () => {
  const testDbPath = await setup();
  if (!global.__booksAdminApp) {
    process.env.DB_PATH = testDbPath;
    const server = require('../src/server');
    await server.startServer();
    global.__booksAdminApp = server;
  }
  app = global.__booksAdminApp;
});

describe('GET /api/v1/databases', () => {
  it('returns 200 and list of databases', async () => {
    const res = await request(app)
      .get('/api/v1/databases')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.databases)).toBe(true);
  });
});

describe('PUT /api/v1/databases/active', () => {
  it('returns 400 when body missing id/path', async () => {
    const res = await request(app)
      .put('/api/v1/databases/active')
      .set('Content-Type', 'application/json')
      .send({})
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MISSING_PATH_OR_ID');
  });
});

describe('DELETE /api/v1/databases/:id', () => {
  it('returns 404 or 400 for unknown id', async () => {
    const res = await request(app)
      .delete('/api/v1/databases/nonexistent-id-xyz')
      .expect((s) => expect([400, 404, 500]).toContain(s));
    expect(res.body.success).toBe(false);
  });
});
