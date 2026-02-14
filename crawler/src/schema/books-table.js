/**
 * Single source of truth for the books table DDL.
 * Used by crawler/src/models/database.js and crawler/src/crawler.js to avoid schema drift.
 * See docs/architecture/data-models-and-schema.md for full documentation.
 */

const CREATE_BOOKS_TABLE_SQL = `
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
    chapter_count INTEGER DEFAULT 0
  )
`.trim();

/** Column names for schema compliance checks (Story 1.4). */
const BOOKS_TABLE_COLUMNS = [
  'id', 'title', 'author', 'description', 'duration', 'duration_formatted',
  'type', 'language', 'category', 'rating', 'rating_count', 'cover_image_url',
  'main_audio_url', 'download_url', 'file_size', 'published_at', 'created_at',
  'updated_at', 'is_active', 'crawl_status', 'has_chapters', 'chapter_count'
];

module.exports = {
  CREATE_BOOKS_TABLE_SQL,
  BOOKS_TABLE_COLUMNS
};
