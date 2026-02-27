/**
 * Single source of truth for the authors table DDL.
 * Epic 9: Database schema normalization.
 * See docs/architecture/data-models-and-schema.md and docs/architecture/epic-9-schema-changes.md.
 */

const CREATE_AUTHORS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`.trim();

const CREATE_AUTHORS_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(name)
`.trim();

/** Column names for schema compliance checks. */
const AUTHORS_TABLE_COLUMNS = [
  'id', 'name', 'created_at', 'updated_at'
];

module.exports = {
  CREATE_AUTHORS_TABLE_SQL,
  CREATE_AUTHORS_INDEX_SQL,
  AUTHORS_TABLE_COLUMNS
};

