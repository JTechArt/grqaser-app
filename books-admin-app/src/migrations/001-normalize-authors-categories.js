/**
 * Migration 001: Normalize Authors and Categories
 * Epic 9: Database schema normalization
 * 
 * This migration:
 * 1. Creates authors and book_categories tables
 * 2. Populates them from existing books data
 * 3. Adds author_id and category_id columns to books table
 * 4. Updates foreign keys
 * 5. Creates indexes for performance
 * 6. Verifies data integrity
 * 
 * See docs/architecture/epic-9-schema-changes.md for details.
 */

const { CREATE_AUTHORS_TABLE_SQL, CREATE_AUTHORS_INDEX_SQL } = require('../crawler/schema/authors-table');
const { CREATE_BOOK_CATEGORIES_TABLE_SQL, CREATE_BOOK_CATEGORIES_INDEX_SQL } = require('../crawler/schema/book-categories-table');

/**
 * Run the migration
 * @param {Database} db - better-sqlite3 database instance
 * @returns {object} Migration results with before/after counts
 */
function up(db) {
  console.log('Starting migration 001: Normalize Authors and Categories...');
  
  // Collect pre-migration stats
  const beforeStats = collectStats(db);
  console.log('Before migration:', beforeStats);
  
  // Step 1: Create new tables
  console.log('Step 1: Creating authors and book_categories tables...');
  db.exec(CREATE_AUTHORS_TABLE_SQL);
  db.exec(CREATE_BOOK_CATEGORIES_TABLE_SQL);
  
  // Step 2: Add foreign key columns to books table
  console.log('Step 2: Adding foreign key columns to books table...');
  try {
    db.exec('ALTER TABLE books ADD COLUMN author_id INTEGER REFERENCES authors(id)');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      throw err;
    }
    console.log('  author_id column already exists, skipping...');
  }
  
  try {
    db.exec('ALTER TABLE books ADD COLUMN category_id INTEGER REFERENCES book_categories(id)');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      throw err;
    }
    console.log('  category_id column already exists, skipping...');
  }
  
  // Step 3: Populate authors table
  console.log('Step 3: Populating authors table...');
  const insertAuthorsSQL = `
    INSERT OR IGNORE INTO authors (name)
    SELECT DISTINCT TRIM(author) as author_name
    FROM books
    WHERE author IS NOT NULL 
      AND TRIM(author) != ''
      AND TRIM(author) != 'Unknown Author'
    ORDER BY author_name
  `;
  db.exec(insertAuthorsSQL);
  
  // Step 4: Populate book_categories table
  console.log('Step 4: Populating book_categories table...');
  const insertCategoriesSQL = `
    INSERT OR IGNORE INTO book_categories (name)
    SELECT DISTINCT TRIM(category) as category_name
    FROM books
    WHERE category IS NOT NULL 
      AND TRIM(category) != ''
      AND TRIM(category) != 'Unknown'
    ORDER BY category_name
  `;
  db.exec(insertCategoriesSQL);
  
  // Step 5: Update books.author_id
  console.log('Step 5: Updating books.author_id...');
  const updateAuthorIdSQL = `
    UPDATE books
    SET author_id = (
      SELECT id FROM authors 
      WHERE authors.name = TRIM(books.author)
    )
    WHERE author IS NOT NULL 
      AND TRIM(author) != ''
      AND TRIM(author) != 'Unknown Author'
  `;
  const authorIdResult = db.exec(updateAuthorIdSQL);
  
  // Step 6: Update books.category_id
  console.log('Step 6: Updating books.category_id...');
  const updateCategoryIdSQL = `
    UPDATE books
    SET category_id = (
      SELECT id FROM book_categories 
      WHERE book_categories.name = TRIM(books.category)
    )
    WHERE category IS NOT NULL 
      AND TRIM(category) != ''
      AND TRIM(category) != 'Unknown'
  `;
  const categoryIdResult = db.exec(updateCategoryIdSQL);
  
  // Step 7: Create indexes
  console.log('Step 7: Creating indexes...');
  db.exec(CREATE_AUTHORS_INDEX_SQL);
  db.exec(CREATE_BOOK_CATEGORIES_INDEX_SQL);
  db.exec('CREATE INDEX IF NOT EXISTS idx_books_author_id ON books(author_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_books_category_id ON books(category_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_books_duration ON books(duration)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_books_author_category ON books(author_id, category_id)');
  
  // Collect post-migration stats
  const afterStats = collectStats(db);
  console.log('After migration:', afterStats);
  
  // Verify data integrity
  verifyIntegrity(beforeStats, afterStats);
  
  console.log('Migration 001 completed successfully!');
  
  return {
    before: beforeStats,
    after: afterStats
  };
}

/**
 * Collect statistics before/after migration
 */
function collectStats(db) {
  const stats = {};

  stats.totalBooks = db.prepare('SELECT COUNT(*) as count FROM books').get().count;

  // Count books with authors
  stats.booksWithAuthor = db.prepare(`
    SELECT COUNT(*) as count FROM books
    WHERE author IS NOT NULL AND TRIM(author) != '' AND TRIM(author) != 'Unknown Author'
  `).get().count;

  // Count books with categories
  stats.booksWithCategory = db.prepare(`
    SELECT COUNT(*) as count FROM books
    WHERE category IS NOT NULL AND TRIM(category) != '' AND TRIM(category) != 'Unknown'
  `).get().count;

  // Count unique authors (before migration)
  try {
    stats.uniqueAuthors = db.prepare(`
      SELECT COUNT(DISTINCT TRIM(author)) as count FROM books
      WHERE author IS NOT NULL AND TRIM(author) != '' AND TRIM(author) != 'Unknown Author'
    `).get().count;
  } catch (err) {
    stats.uniqueAuthors = 0;
  }

  // Count unique categories (before migration)
  try {
    stats.uniqueCategories = db.prepare(`
      SELECT COUNT(DISTINCT TRIM(category)) as count FROM books
      WHERE category IS NOT NULL AND TRIM(category) != '' AND TRIM(category) != 'Unknown'
    `).get().count;
  } catch (err) {
    stats.uniqueCategories = 0;
  }

  // Count authors in authors table (after migration)
  try {
    stats.totalAuthors = db.prepare('SELECT COUNT(*) as count FROM authors').get().count;
  } catch (err) {
    stats.totalAuthors = 0;
  }

  // Count categories in book_categories table (after migration)
  try {
    stats.totalCategories = db.prepare('SELECT COUNT(*) as count FROM book_categories').get().count;
  } catch (err) {
    stats.totalCategories = 0;
  }

  // Count books with author_id (after migration)
  try {
    stats.booksWithAuthorId = db.prepare(`
      SELECT COUNT(*) as count FROM books WHERE author_id IS NOT NULL
    `).get().count;
  } catch (err) {
    stats.booksWithAuthorId = 0;
  }

  // Count books with category_id (after migration)
  try {
    stats.booksWithCategoryId = db.prepare(`
      SELECT COUNT(*) as count FROM books WHERE category_id IS NOT NULL
    `).get().count;
  } catch (err) {
    stats.booksWithCategoryId = 0;
  }

  return stats;
}

/**
 * Verify data integrity after migration
 */
function verifyIntegrity(beforeStats, afterStats) {
  console.log('\nVerifying data integrity...');

  const errors = [];

  // Total books should not change
  if (beforeStats.totalBooks !== afterStats.totalBooks) {
    errors.push(`Total books changed: ${beforeStats.totalBooks} -> ${afterStats.totalBooks}`);
  }

  // Books with author_id should match books with author
  if (afterStats.booksWithAuthorId !== beforeStats.booksWithAuthor) {
    errors.push(`Books with author_id (${afterStats.booksWithAuthorId}) != books with author (${beforeStats.booksWithAuthor})`);
  }

  // Books with category_id should match books with category
  if (afterStats.booksWithCategoryId !== beforeStats.booksWithCategory) {
    errors.push(`Books with category_id (${afterStats.booksWithCategoryId}) != books with category (${beforeStats.booksWithCategory})`);
  }

  // Authors table should have expected count
  if (afterStats.totalAuthors !== beforeStats.uniqueAuthors) {
    console.log(`  Warning: Authors count (${afterStats.totalAuthors}) != unique authors (${beforeStats.uniqueAuthors})`);
  }

  // Categories table should have expected count
  if (afterStats.totalCategories !== beforeStats.uniqueCategories) {
    console.log(`  Warning: Categories count (${afterStats.totalCategories}) != unique categories (${beforeStats.uniqueCategories})`);
  }

  if (errors.length > 0) {
    console.error('\n❌ Data integrity check FAILED:');
    errors.forEach(err => console.error(`  - ${err}`));
    throw new Error('Migration data integrity check failed');
  }

  console.log('✅ Data integrity verified successfully!');
}

/**
 * Rollback the migration
 * @param {Database} db - better-sqlite3 database instance
 */
function down(db) {
  console.log('Rolling back migration 001: Normalize Authors and Categories...');

  // Drop indexes
  console.log('Dropping indexes...');
  db.exec('DROP INDEX IF EXISTS idx_books_author_category');
  db.exec('DROP INDEX IF EXISTS idx_books_duration');
  db.exec('DROP INDEX IF EXISTS idx_books_category_id');
  db.exec('DROP INDEX IF EXISTS idx_books_author_id');
  db.exec('DROP INDEX IF EXISTS idx_categories_name');
  db.exec('DROP INDEX IF EXISTS idx_authors_name');

  // Note: SQLite doesn't support DROP COLUMN, so we can't remove author_id and category_id
  // The columns will remain but will be NULL
  console.log('Clearing foreign key columns...');
  db.exec('UPDATE books SET author_id = NULL');
  db.exec('UPDATE books SET category_id = NULL');

  // Drop tables
  console.log('Dropping tables...');
  db.exec('DROP TABLE IF EXISTS book_categories');
  db.exec('DROP TABLE IF EXISTS authors');

  console.log('Rollback completed!');
}

module.exports = {
  up,
  down,
  collectStats,
  verifyIntegrity
};

