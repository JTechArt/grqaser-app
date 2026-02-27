/**
 * Single source of truth for the books table DDL.
 * Used by crawler/src/models/database.js and crawler/src/crawler.js to avoid schema drift.
 * See docs/architecture/data-models-and-schema.md for full documentation.
 * Epic 9: Added author_id and category_id foreign keys for schema normalization.
 */

const CREATE_BOOKS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(200) DEFAULT 'Unknown Author',
    author_id INTEGER REFERENCES authors(id),
    description TEXT,
    duration INTEGER,
    duration_formatted TEXT,
    type VARCHAR(50) DEFAULT 'audiobook',
    language VARCHAR(10) DEFAULT 'hy',
    category VARCHAR(100) DEFAULT 'Unknown',
    category_id INTEGER REFERENCES book_categories(id),
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
`.trim();

/**
 * Column names for schema compliance checks (Story 1.4).
 * Epic 6: last_edited_at for manual edit audit.
 * Epic 9: author_id and category_id for schema normalization.
 */
const BOOKS_TABLE_COLUMNS = [
  'id', 'title', 'author', 'author_id', 'description', 'duration', 'duration_formatted',
  'type', 'language', 'category', 'category_id', 'rating', 'rating_count', 'cover_image_url',
  'main_audio_url', 'download_url', 'file_size', 'published_at', 'created_at',
  'updated_at', 'is_active', 'crawl_status', 'has_chapters', 'chapter_count', 'chapter_urls',
  'last_edited_at'
];

module.exports = {
  CREATE_BOOKS_TABLE_SQL,
  BOOKS_TABLE_COLUMNS
};
