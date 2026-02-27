/**
 * Tests for migration 001: Normalize Authors and Categories
 * Epic 9: Database schema normalization
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');
const migration = require('../src/migrations/001-normalize-authors-categories');
const { CREATE_BOOKS_TABLE_SQL } = require('../src/crawler/schema/books-table');

describe('Migration 001: Normalize Authors and Categories', () => {
  let testDbPath;
  let db;

  beforeEach(() => {
    // Create a temporary test database
    testDbPath = path.join(os.tmpdir(), `test-migration-${Date.now()}.db`);
    db = new Database(testDbPath);
    
    // Create books table with old schema (without author_id and category_id)
    const oldBooksTableSQL = `
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        author VARCHAR(200) DEFAULT 'Unknown Author',
        description TEXT,
        duration INTEGER,
        duration_formatted TEXT,
        type VARCHAR(50) DEFAULT 'audiobook',
        language VARCHAR(10) DEFAULT 'hy',
        category VARCHAR(100) DEFAULT 'Unknown',
        rating DECIMAL(3,2),
        rating_count INTEGER,
        cover_image_url TEXT,
        main_audio_url TEXT,
        download_url TEXT,
        file_size INTEGER,
        published_at DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        crawl_status VARCHAR(50) DEFAULT 'discovered',
        has_chapters BOOLEAN DEFAULT 0,
        chapter_count INTEGER DEFAULT 0,
        chapter_urls TEXT,
        last_edited_at TIMESTAMP
      )
    `;
    db.exec(oldBooksTableSQL);
    
    // Insert test data
    const insert = db.prepare(`
      INSERT INTO books (id, title, author, category, duration)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    insert.run(1, 'Book 1', 'John Smith', 'Fiction', 120);
    insert.run(2, 'Book 2', 'Jane Doe', 'Non-Fiction', 90);
    insert.run(3, 'Book 3', 'John Smith', 'Fiction', 150);
    insert.run(4, 'Book 4', 'Bob Johnson', 'Mystery', 180);
    insert.run(5, 'Book 5', 'Jane Doe', 'Non-Fiction', 60);
    insert.run(6, 'Book 6', 'Unknown Author', 'Unknown', 45);
    insert.run(7, 'Book 7', '  John Smith  ', 'Fiction', 200); // Test trimming
    insert.run(8, 'Book 8', '', '', 30); // Empty author/category
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  test('should create authors and book_categories tables', () => {
    migration.up(db);
    
    // Check authors table exists
    const authorsTable = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='authors'
    `).get();
    expect(authorsTable).toBeDefined();
    
    // Check book_categories table exists
    const categoriesTable = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='book_categories'
    `).get();
    expect(categoriesTable).toBeDefined();
  });

  test('should populate authors table with unique authors', () => {
    migration.up(db);
    
    const authors = db.prepare('SELECT name FROM authors ORDER BY name').all();
    
    // Should have 3 unique authors (excluding 'Unknown Author' and empty)
    expect(authors).toHaveLength(3);
    expect(authors.map(a => a.name)).toEqual(['Bob Johnson', 'Jane Doe', 'John Smith']);
  });

  test('should populate book_categories table with unique categories', () => {
    migration.up(db);
    
    const categories = db.prepare('SELECT name FROM book_categories ORDER BY name').all();
    
    // Should have 3 unique categories (excluding 'Unknown' and empty)
    expect(categories).toHaveLength(3);
    expect(categories.map(c => c.name)).toEqual(['Fiction', 'Mystery', 'Non-Fiction']);
  });

  test('should add author_id and category_id columns to books table', () => {
    migration.up(db);
    
    const columns = db.prepare("SELECT name FROM pragma_table_info('books')").all();
    const columnNames = columns.map(c => c.name);
    
    expect(columnNames).toContain('author_id');
    expect(columnNames).toContain('category_id');
  });

  test('should update books with correct author_id', () => {
    migration.up(db);
    
    // Get John Smith's author_id
    const johnSmith = db.prepare("SELECT id FROM authors WHERE name = 'John Smith'").get();
    
    // Books 1, 3, and 7 should have John Smith's author_id
    const johnSmithBooks = db.prepare('SELECT id FROM books WHERE author_id = ?').all(johnSmith.id);
    expect(johnSmithBooks).toHaveLength(3);
    expect(johnSmithBooks.map(b => b.id).sort()).toEqual([1, 3, 7]);
  });

  test('should update books with correct category_id', () => {
    migration.up(db);

    // Get Fiction category_id
    const fiction = db.prepare("SELECT id FROM book_categories WHERE name = 'Fiction'").get();

    // Books 1, 3, and 7 should have Fiction category_id
    const fictionBooks = db.prepare('SELECT id FROM books WHERE category_id = ?').all(fiction.id);
    expect(fictionBooks).toHaveLength(3);
    expect(fictionBooks.map(b => b.id).sort()).toEqual([1, 3, 7]);
  });

  test('should handle trimming of author names', () => {
    migration.up(db);

    // Book 7 has '  John Smith  ' which should be trimmed to 'John Smith'
    const book7 = db.prepare('SELECT author_id FROM books WHERE id = 7').get();
    const johnSmith = db.prepare("SELECT id FROM authors WHERE name = 'John Smith'").get();

    expect(book7.author_id).toBe(johnSmith.id);
  });

  test('should not create author_id for Unknown Author', () => {
    migration.up(db);

    // Book 6 has 'Unknown Author' which should not get an author_id
    const book6 = db.prepare('SELECT author_id FROM books WHERE id = 6').get();
    expect(book6.author_id).toBeNull();
  });

  test('should not create category_id for Unknown category', () => {
    migration.up(db);

    // Book 6 has 'Unknown' category which should not get a category_id
    const book6 = db.prepare('SELECT category_id FROM books WHERE id = 6').get();
    expect(book6.category_id).toBeNull();
  });

  test('should not create author_id for empty author', () => {
    migration.up(db);

    // Book 8 has empty author which should not get an author_id
    const book8 = db.prepare('SELECT author_id FROM books WHERE id = 8').get();
    expect(book8.author_id).toBeNull();
  });

  test('should create all required indexes', () => {
    migration.up(db);

    const indexes = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='index'
    `).all();

    const indexNames = indexes.map(i => i.name);

    expect(indexNames).toContain('idx_authors_name');
    expect(indexNames).toContain('idx_categories_name');
    expect(indexNames).toContain('idx_books_author_id');
    expect(indexNames).toContain('idx_books_category_id');
    expect(indexNames).toContain('idx_books_duration');
    expect(indexNames).toContain('idx_books_author_category');
  });

  test('should verify data integrity', () => {
    const result = migration.up(db);

    // Total books should not change
    expect(result.after.totalBooks).toBe(8);
    expect(result.before.totalBooks).toBe(result.after.totalBooks);

    // Books with author_id should match books with valid authors
    expect(result.after.booksWithAuthorId).toBe(result.before.booksWithAuthor);

    // Books with category_id should match books with valid categories
    expect(result.after.booksWithCategoryId).toBe(result.before.booksWithCategory);
  });

  test('should rollback migration successfully', () => {
    // Run migration
    migration.up(db);

    // Verify tables exist
    let authorsTable = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='authors'
    `).get();
    expect(authorsTable).toBeDefined();

    // Rollback
    migration.down(db);

    // Verify tables are dropped
    authorsTable = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='authors'
    `).get();
    expect(authorsTable).toBeUndefined();

    const categoriesTable = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='book_categories'
    `).get();
    expect(categoriesTable).toBeUndefined();

    // Verify foreign keys are cleared
    const booksWithAuthorId = db.prepare(`
      SELECT COUNT(*) as count FROM books WHERE author_id IS NOT NULL
    `).get();
    expect(booksWithAuthorId.count).toBe(0);
  });

  test('should handle migration on already migrated database', () => {
    // Run migration twice
    migration.up(db);

    // Should not throw error when run again
    expect(() => migration.up(db)).not.toThrow();

    // Data should still be correct
    const authors = db.prepare('SELECT COUNT(*) as count FROM authors').get();
    expect(authors.count).toBe(3);
  });
});

