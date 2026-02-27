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
  it('returns 200 and all books when filters are missing', async () => {
    const res = await request(app)
      .get('/api/v1/books/search')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.books)).toBe(true);
    expect(res.body.data.total).toBeGreaterThanOrEqual(3);
  });

  it('returns 200 and matching books when q provided', async () => {
    const res = await request(app)
      .get('/api/v1/books/search?q=Audiobook')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.books)).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
  });

  it('supports filtering by author_ids', async () => {
    const authorRes = await request(app).get('/api/v1/authors').expect(200);
    const authorAlpha = authorRes.body.data.find((author) => author.name === 'Author Alpha');
    const res = await request(app)
      .get(`/api/v1/books/search?author_ids=${authorAlpha.id}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.books.length).toBeGreaterThan(0);
    res.body.data.books.forEach((book) => {
      expect(book.author).toBe('Author Alpha');
    });
  });

  it('supports filtering by category_ids', async () => {
    const categoryRes = await request(app).get('/api/v1/categories').expect(200);
    const fiction = categoryRes.body.data.find((category) => category.name === 'Fiction');
    const res = await request(app)
      .get(`/api/v1/books/search?category_ids=${fiction.id}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.books.length).toBeGreaterThan(0);
    res.body.data.books.forEach((book) => {
      expect(book.category).toBe('Fiction');
    });
  });

  it('supports duration_range filter', async () => {
    const res = await request(app)
      .get('/api/v1/books/search?duration_range=300+')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.books.length).toBe(1);
    expect(res.body.data.books[0].title).toBe('Third Title');
  });

  it('supports text filter over title and description', async () => {
    const res = await request(app)
      .get('/api/v1/books/search?text=Another')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.books.length).toBe(1);
    expect(res.body.data.books[0].title).toBe('Third Title');
  });

  it('applies AND logic when filters are combined', async () => {
    const authorRes = await request(app).get('/api/v1/authors').expect(200);
    const authorAlpha = authorRes.body.data.find((author) => author.name === 'Author Alpha');
    const categoryRes = await request(app).get('/api/v1/categories').expect(200);
    const fiction = categoryRes.body.data.find((category) => category.name === 'Fiction');
    const res = await request(app)
      .get(`/api/v1/books/search?author_ids=${authorAlpha.id}&category_ids=${fiction.id}&duration_range=300+&text=Third`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.books.length).toBe(1);
    expect(res.body.data.books[0].title).toBe('Third Title');
  });

  it('ignores invalid author_ids/category_ids values and still returns 200', async () => {
    const res = await request(app)
      .get('/api/v1/books/search?author_ids=abc,-2,0&category_ids=x,999999z')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.books)).toBe(true);
  });

  it('handles special characters in text query safely', async () => {
    const res = await request(app)
      .get('/api/v1/books/search?text=%27%22%3Cscript%3E')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.books)).toBe(true);
  });
});

describe('GET /api/v1/authors', () => {
  it('returns 200 and author list with book counts', async () => {
    const res = await request(app)
      .get('/api/v1/authors')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Author Alpha', book_count: 2 }),
        expect.objectContaining({ name: 'Author Beta', book_count: 1 })
      ])
    );
  });
});

describe('GET /api/v1/categories', () => {
  it('returns 200 and category list with book counts', async () => {
    const res = await request(app)
      .get('/api/v1/categories')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Fiction', book_count: 2 }),
        expect.objectContaining({ name: 'Non-Fiction', book_count: 1 })
      ])
    );
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

  it('updates author/category through author_id/category_id', async () => {
    const authorRes = await request(app).get('/api/v1/authors').expect(200);
    const authorBeta = authorRes.body.data.find((author) => author.name === 'Author Beta');
    const categoryRes = await request(app).get('/api/v1/categories').expect(200);
    const nonFiction = categoryRes.body.data.find((category) => category.name === 'Non-Fiction');

    const patchRes = await request(app)
      .patch('/api/v1/books/1')
      .send({ title: 'First Audiobook', author_id: authorBeta.id, category_id: nonFiction.id })
      .expect(200);

    expect(patchRes.body.success).toBe(true);
    expect(patchRes.body.data.author_id).toBe(authorBeta.id);
    expect(patchRes.body.data.category_id).toBe(nonFiction.id);
    expect(patchRes.body.data.author).toBe('Author Beta');
    expect(patchRes.body.data.category).toBe('Non-Fiction');
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
