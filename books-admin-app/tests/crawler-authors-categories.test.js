const os = require('os');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { GrqaserCrawler } = require('../src/crawler/crawler');
const { CREATE_BOOKS_TABLE_SQL } = require('../src/crawler/schema/books-table');
const { CREATE_AUTHORS_TABLE_SQL } = require('../src/crawler/schema/authors-table');
const { CREATE_BOOK_CATEGORIES_TABLE_SQL } = require('../src/crawler/schema/book-categories-table');

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function(err, row) {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

describe('Crawler author/category integration', () => {
  let dbPath;
  let db;
  let crawler;

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `grqaser-crawler-author-cat-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
    db = new sqlite3.Database(dbPath);
    await run(db, CREATE_AUTHORS_TABLE_SQL);
    await run(db, CREATE_BOOK_CATEGORIES_TABLE_SQL);
    await run(db, CREATE_BOOKS_TABLE_SQL);
    crawler = new GrqaserCrawler({ mode: 'test', testDbPath: dbPath, testLimit: 1 });
    crawler.db = db;
  });

  afterEach(async () => {
    if (db) {
      await new Promise((resolve) => db.close(resolve));
    }
    if (dbPath && fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('upserts author/category and stores author_id/category_id on insert', async () => {
    await crawler.saveBookToDatabase({
      id: 101,
      title: 'Crawler Book',
      author: 'Crawler Author',
      category: 'Crawler Category',
      description: 'seed',
      crawl_status: 'completed'
    });

    const book = await get(db, 'SELECT author, author_id, category, category_id FROM books WHERE id = ?', [101]);
    expect(book.author).toBe('Crawler Author');
    expect(book.category).toBe('Crawler Category');
    expect(book.author_id).toBeGreaterThan(0);
    expect(book.category_id).toBeGreaterThan(0);

    const author = await get(db, 'SELECT id, name FROM authors WHERE id = ?', [book.author_id]);
    const category = await get(db, 'SELECT id, name FROM book_categories WHERE id = ?', [book.category_id]);
    expect(author.name).toBe('Crawler Author');
    expect(category.name).toBe('Crawler Category');
  });

  it('updates author/category links when updateBookById is used', async () => {
    await crawler.saveBookToDatabase({
      id: 102,
      title: 'Crawler Update',
      author: 'Author One',
      category: 'Category One',
      description: 'seed',
      crawl_status: 'completed'
    });

    await crawler.updateBookById({
      id: 102,
      title: 'Crawler Update',
      author: 'Author Two',
      category: 'Category Two',
      description: 'changed',
      crawl_status: 'completed'
    });

    const book = await get(db, 'SELECT author, author_id, category, category_id FROM books WHERE id = ?', [102]);
    expect(book.author).toBe('Author Two');
    expect(book.category).toBe('Category Two');

    const author = await get(db, 'SELECT name FROM authors WHERE id = ?', [book.author_id]);
    const category = await get(db, 'SELECT name FROM book_categories WHERE id = ?', [book.category_id]);
    expect(author.name).toBe('Author Two');
    expect(category.name).toBe('Category Two');
  });
});
