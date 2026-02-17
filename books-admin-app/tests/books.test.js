/**
 * Books API tests. GET /api/v1/books, /books/:id, /books/search.
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

describe('GET /api/v1/books', () => {
  it('returns 200 and list with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/books')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.books)).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.page).toBe(1);
    expect(typeof res.body.data.pagination.total).toBe('number');
  });

  it('accepts page and limit query params', async () => {
    const res = await request(app)
      .get('/api/v1/books?page=1&limit=2')
      .expect(200);
    expect(res.body.data.books.length).toBeLessThanOrEqual(2);
    expect(res.body.data.pagination.limit).toBe(2);
  });

  it('filters by category', async () => {
    const res = await request(app)
      .get('/api/v1/books?category=Fiction')
      .expect(200);
    expect(res.body.success).toBe(true);
    res.body.data.books.forEach((book) => {
      expect(book.category).toBe('Fiction');
    });
  });
});

describe('GET /api/v1/books/:id', () => {
  it('returns 200 and book when id exists', async () => {
    const res = await request(app)
      .get('/api/v1/books/1')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.title).toBe('First Audiobook');
  });

  it('returns 404 when book not found', async () => {
    const res = await request(app)
      .get('/api/v1/books/99999')
      .expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BOOK_NOT_FOUND');
  });
});

describe('GET /api/v1/books/search', () => {
  it('returns 400 when q is missing', async () => {
    await request(app)
      .get('/api/v1/books/search')
      .expect(400);
  });

  it('returns 200 and matching books when q provided', async () => {
    const res = await request(app)
      .get('/api/v1/books/search?q=Audiobook')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.books)).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
  });
});

describe('PATCH /api/v1/books/:id', () => {
  it('returns 200 and updated book (in-place UPDATE)', async () => {
    const res = await request(app)
      .patch('/api/v1/books/1')
      .send({ title: 'First Audiobook', author: 'Author Alpha Updated' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.title).toBe('First Audiobook');
    expect(res.body.data.author).toBe('Author Alpha Updated');
    expect(res.body.data.last_edited_at).toBeDefined();
    const getRes = await request(app).get('/api/v1/books/1').expect(200);
    expect(getRes.body.data.author).toBe('Author Alpha Updated');
    expect(getRes.body.data.last_edited_at).toBeDefined();
  });

  it('returns 400 when title is empty', async () => {
    const res = await request(app)
      .patch('/api/v1/books/1')
      .send({ title: '  ' })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when rating out of range', async () => {
    const res = await request(app)
      .patch('/api/v1/books/1')
      .send({ title: 'Ok', rating: 10 })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 when book not found', async () => {
    const res = await request(app)
      .patch('/api/v1/books/99999')
      .send({ title: 'No Such Book' })
      .expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BOOK_NOT_FOUND');
  });

  it('returns 400 when id is not a number', async () => {
    const res = await request(app)
      .patch('/api/v1/books/abc')
      .send({ title: 'Test' })
      .expect(400);
    expect(res.body.success).toBe(false);
  });
});
