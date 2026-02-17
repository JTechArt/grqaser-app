/**
 * Books API tests (Story 2.1, AC1–AC3).
 * GET /api/v1/books (list, pagination, filters), GET /api/v1/books/:id, GET /api/v1/books/search?q=
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

describe('GET /api/v1/books', () => {
  it('returns 200 and list with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/books')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.books)).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.limit).toBeDefined();
    expect(typeof res.body.data.pagination.total).toBe('number');
    expect(res.body.data.pagination.pages).toBeGreaterThanOrEqual(0);
  });

  it('accepts page and limit query params', async () => {
    const res = await request(app)
      .get('/api/v1/books?page=1&limit=2')
      .expect(200);
    expect(res.body.data.books.length).toBeLessThanOrEqual(2);
    expect(res.body.data.pagination.limit).toBe(2);
    expect(res.body.data.pagination.page).toBe(1);
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

  it('filters by author (partial match)', async () => {
    const res = await request(app)
      .get('/api/v1/books?author=Alpha')
      .expect(200);
    expect(res.body.success).toBe(true);
    res.body.data.books.forEach((book) => {
      expect(book.author).toContain('Alpha');
    });
  });

  it('returns books with expected fields', async () => {
    const res = await request(app)
      .get('/api/v1/books?limit=1')
      .expect(200);
    const book = res.body.data.books[0];
    expect(book).toBeDefined();
    expect(book.id).toBeDefined();
    expect(book.title).toBeDefined();
    expect(book.author).toBeDefined();
    expect(book.duration_formatted).toBeDefined();
    expect(book.created_at).toBeDefined();
    expect(book.updated_at).toBeDefined();
  });

  it('ignores invalid sort_by and uses default (SEC-001 whitelist)', async () => {
    const res = await request(app)
      .get('/api/v1/books?sort_by=id; DROP TABLE books--&sort_order=DESC')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.books)).toBe(true);
    expect(res.body.data.books.length).toBeGreaterThanOrEqual(0);
  });

  it('accepts valid sort_by and sort_order', async () => {
    const res = await request(app)
      .get('/api/v1/books?sort_by=title&sort_order=ASC&limit=3')
      .expect(200);
    expect(res.body.success).toBe(true);
    const books = res.body.data.books;
    if (books.length >= 2) {
      expect(books[0].title <= books[1].title).toBe(true);
    }
  });
});

describe('GET /api/v1/books/:id', () => {
  it('returns 200 and single book when id exists', async () => {
    const res = await request(app)
      .get('/api/v1/books/1')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.title).toBeDefined();
    expect(res.body.data.author).toBeDefined();
  });

  it('returns 404 when book id does not exist', async () => {
    const res = await request(app)
      .get('/api/v1/books/99999')
      .expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BOOK_NOT_FOUND');
    expect(res.body.error.details.book_id).toBe('99999');
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

  it('returns 200 and search results for title match', async () => {
    const res = await request(app)
      .get('/api/v1/books/search?q=First')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.books)).toBe(true);
    expect(res.body.data.books.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.books[0].title).toContain('First');
    expect(res.body.data.pagination).toBeDefined();
  });

  it('returns 200 and search results for author match', async () => {
    const res = await request(app)
      .get('/api/v1/books/search?q=Alpha')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.books.some((b) => b.author.includes('Alpha'))).toBe(true);
  });

  it('returns 200 and search results for description match', async () => {
    const res = await request(app)
      .get('/api/v1/books/search?q=Another')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.books.some((b) => (b.description || '').includes('Another'))).toBe(true);
  });

  it('accepts page and limit for search', async () => {
    const res = await request(app)
      .get('/api/v1/books/search?q=Book&page=1&limit=1')
      .expect(200);
    expect(res.body.data.books.length).toBeLessThanOrEqual(1);
    expect(res.body.data.pagination.limit).toBe(1);
  });
});
