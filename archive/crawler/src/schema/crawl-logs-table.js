/**
 * DDL for crawl_logs table. Single source of truth for crawler and database-viewer.
 * See docs/architecture/data-models-and-schema.md.
 */

const CREATE_CRAWL_LOGS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS crawl_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    book_id INTEGER,
    url TEXT,
    error_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`.trim();

module.exports = {
  CREATE_CRAWL_LOGS_TABLE_SQL
};
