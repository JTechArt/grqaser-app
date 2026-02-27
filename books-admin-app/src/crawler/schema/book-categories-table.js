/**
 * Single source of truth for the book_categories table DDL.
 * Epic 9: Database schema normalization.
 * See docs/architecture/data-models-and-schema.md and docs/architecture/epic-9-schema-changes.md.
 */

const CREATE_BOOK_CATEGORIES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS book_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`.trim();

const CREATE_BOOK_CATEGORIES_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_categories_name ON book_categories(name)
`.trim();

/** Column names for schema compliance checks. */
const BOOK_CATEGORIES_TABLE_COLUMNS = [
  'id', 'name', 'created_at', 'updated_at'
];

module.exports = {
  CREATE_BOOK_CATEGORIES_TABLE_SQL,
  CREATE_BOOK_CATEGORIES_INDEX_SQL,
  BOOK_CATEGORIES_TABLE_COLUMNS
};

