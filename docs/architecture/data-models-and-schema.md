# Data models and schema

Shared data contract for the crawler (writer), database-viewer (reader), and GrqaserApp (reader). Schema is versioned and documented; the crawler is the single source of truth for updates. See [delivery order](./delivery-order-and-application-boundaries.md) for phase dependencies.

## Canonical store

- **Database:** SQLite (`grqaser.db`), path configurable (e.g. `crawler/data/grqaser.db` or `database-viewer/data/grqaser.db` when copied).
- **Writer:** Crawler (and, in Epic 6, books-admin-app for manual edits to the active DB). Database-viewer is read-only; GrqaserApp never writes.
- **Schema ownership:** Defined and evolved in Phase 1; documented here for viewer and app.

## Core entities (summary)

### Books

- **Purpose:** Audiobook catalog entry from grqaser.org.
- **Key attributes (align with crawler implementation):** id, title, author, description, duration (structured or formatted), type, language, category, rating, cover_image_url, main_audio_url, download_url, crawl_status, has_chapters, chapter_count, chapter_urls (Story 1.5). Normalized: no HTML in text fields, consistent encoding, unique IDs.
- **Relationships (Epic 9):** Authors and categories are normalized into separate tables `authors` and `book_categories`. Books reference them via `author_id` and `category_id` foreign keys. Original `author` and `category` columns are kept temporarily for backward compatibility. See [Epic 9 schema changes](./epic-9-schema-changes.md).

### URL queue (crawler-internal)

- **Purpose:** Prioritized queue for crawl URLs, retries, status.
- **Key attributes:** url, url_type, priority, status, retry_count, max_retries, error_message. Used by crawler and exposed read-only via database-viewer crawler status API if required.

### Crawl logs (crawler-internal)

- **Purpose:** Crawl run logs for debugging and monitoring.
- **Key attributes:** level, message, book_id, url, error_details. Exposed via database-viewer crawler logs API if required.

## Authors table (Epic 9)

| Column | Type | Constraints | Notes |
|--------|------|--------------|--------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| name | VARCHAR(200) | UNIQUE NOT NULL | Normalized author name. |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Indexes:** `idx_authors_name ON authors(name)`.

## Book categories table (Epic 9)

| Column | Type | Constraints | Notes |
|--------|------|--------------|--------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| name | VARCHAR(100) | UNIQUE NOT NULL | Normalized category name. |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Indexes:** `idx_categories_name ON book_categories(name)`.

## Books table (DDL)

**Single source of truth:** `crawler/src/schema/books-table.js` — both `crawler/src/models/database.js` and `crawler/src/crawler.js` use this module to create the books table and avoid schema drift.

Current canonical schema (Epic 9 adds `author_id` and `category_id`; original columns kept temporarily):

| Column | Type | Constraints | Notes |
|--------|------|--------------|--------|
| id | INTEGER | PRIMARY KEY | Unique book ID from source (numeric or string coerced). |
| title | VARCHAR(500) | NOT NULL | No HTML; cleaned before write. |
| author | VARCHAR(200) | DEFAULT 'Unknown Author' | No HTML. Kept temporarily (Epic 9 migration). |
| author_id | INTEGER | REFERENCES authors(id) | **Epic 9:** FK to normalized authors table. |
| description | TEXT | | No HTML; cleaned. |
| duration | INTEGER | | Total minutes (from duration parser). |
| duration_formatted | TEXT | | Display string (e.g. "0ժ 51ր"). |
| type | VARCHAR(50) | DEFAULT 'audiobook' | |
| language | VARCHAR(10) | DEFAULT 'hy' | |
| category | VARCHAR(100) | DEFAULT 'Unknown' | Genre/category; no HTML. Kept temporarily (Epic 9 migration). |
| category_id | INTEGER | REFERENCES book_categories(id) | **Epic 9:** FK to normalized book_categories table. |
| rating | DECIMAL(3,2) | | |
| rating_count | INTEGER | | |
| cover_image_url | TEXT | | |
| main_audio_url | TEXT | | Validated (http/https) before write; invalid logged/skipped. |
| download_url | TEXT | | Optional; validated if present. |
| file_size | INTEGER | | |
| published_at | DATE | | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| is_active | BOOLEAN | DEFAULT 1 | |
| crawl_status | VARCHAR(50) | DEFAULT 'discovered' | e.g. 'completed', 'discovered'. |
| has_chapters | BOOLEAN | DEFAULT 0 | |
| chapter_count | INTEGER | DEFAULT 0 | |
| chapter_urls | TEXT | | JSON array of per-chapter audio URLs (Story 1.5); used by update/fix-download-all/full-database modes. |
| last_edited_at | TIMESTAMP | NULL | (Epic 6) Set when a row is updated via books-admin-app manual edit; NULL means only crawler has written. Optional for local-only edit audit. |

**Required for insert:** id, title, author. All text fields must be free of HTML; URLs must pass scheme validation (http/https).

**Validation before write (Story 1.6):** The crawler enforces: non-empty `main_audio_url`, duration ≥ 0, rating in 0–5, `rating_count` non-negative integer, language length ≤ 10, non-empty title. Invalid rows are skipped with reasons logged. Deduplication is by book id and by (title|author); duplicates are skipped and counted.

**Filtering and stats (Story 1.3, Epic 9):** After Epic 9, use `author_id` and `category_id` for filtering and joins. The Database model exposes `getBooksByCategory`, `getBooksByAuthor`, `getCategoryCounts`, `getAuthorCounts`. **Epic 9** adds `GET /api/v1/authors`, `GET /api/v1/categories`, and advanced search with multi-select filters (author_ids, category_ids, duration_range, text). See [Epic 9 schema changes](./epic-9-schema-changes.md) and [database-viewer API](./database-viewer-api-and-deployment.md).

**Books table indexes (Epic 9):** `idx_books_author_id`, `idx_books_category_id`, `idx_books_duration`, `idx_books_author_category`.

## Schema documentation and versioning

- Schema (tables, columns, constraints) must be **documented and versioned** (Epic 1, Story 1.4).
- **Current schema version: 1.** The crawler creates a `schema_version` table with a single row `(version INTEGER)` so database-viewer and GrqaserApp can align (e.g. `SELECT version FROM schema_version`).
- All three applications must use the same schema; any change is made in the crawler first, then reflected in viewer and app consumption.
- Required fields and types must be validated before write in the crawler; invalid rows logged/skipped.

## GrqaserApp mobile-specific schemas (Epic 8)

**After Epic 8:** GrqaserApp reads catalog data from a **local SQLite database** (same books table schema as the canonical crawler output). The following additional tables are **mobile-only** — they exist in the app's local storage (separate from the catalog DB or in a dedicated app metadata DB) and are never synced to the server.

### managed_databases

Tracks catalog database files loaded into the app. One row per downloaded DB version.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | TEXT | PRIMARY KEY | UUID or slug (e.g. `db-v1-20260215`). |
| display_name | TEXT | NOT NULL | User-visible label (e.g. "Catalog v1 — Feb 2026"). |
| source_url | TEXT | NOT NULL | Public URL the DB was downloaded from. |
| file_path | TEXT | NOT NULL | Local file system path to the `.db` file. |
| file_size_bytes | INTEGER | NOT NULL | Size of the DB file on disk. |
| downloaded_at | TEXT | NOT NULL | ISO-8601 timestamp of download. |
| is_active | INTEGER | DEFAULT 0 | 1 = this DB is the active catalog; only one row should be 1 at a time. |

**Rules:** Only the active DB is used for catalog reads. Refresh downloads a new copy alongside the existing one (does not overwrite). The active DB cannot be removed until another DB is set active.

### downloaded_mp3s

Tracks MP3 files downloaded for offline playback, per book.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | TEXT | PRIMARY KEY | UUID or `{book_id}_{chapter_index}`. |
| book_id | TEXT | NOT NULL | References the book ID in the active catalog DB. |
| chapter_index | INTEGER | | Chapter index (NULL for single-file books). |
| file_path | TEXT | NOT NULL | Local file system path to the downloaded MP3. |
| file_size_bytes | INTEGER | NOT NULL | Size of the MP3 file on disk. |
| downloaded_at | TEXT | NOT NULL | ISO-8601 timestamp. |
| audio_url | TEXT | NOT NULL | Original streaming URL (for re-download or fallback reference). |

**Cleanup:** "Clean all" deletes all rows and files; "clean per book" deletes rows and files for chosen `book_id`(s). After cleanup, playback falls back to streaming (online) or shows offline message.

### library_entries

Tracks books auto-added to the Library when the user opens them.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| book_id | TEXT | PRIMARY KEY | References the book ID in the active catalog DB. |
| added_at | TEXT | NOT NULL | ISO-8601 timestamp of when the book was first opened. |
| last_opened_at | TEXT | NOT NULL | ISO-8601 timestamp of the most recent open. |

**Rules:** Auto-added on book open (detail or playback); manual remove deletes the row. Re-opening a removed book re-inserts a new row.

### Notes on mobile schema management

- These tables can live in a **dedicated app metadata SQLite database** (e.g. `grqaser_app_meta.db`) separate from the catalog databases, so that catalog DB swaps do not affect download tracking, library entries, or DB management metadata.
- Storage and mobile data usage (Story 8.5) are computed at runtime from `downloaded_mp3s` (sum of `file_size_bytes`), `managed_databases` (sum of `file_size_bytes`), and platform APIs for mobile data consumption. No separate table is required.

## TypeScript / client types

- GrqaserApp and database-viewer API responses should align with this schema. Shared types (e.g. `Book`, duration shape) can be defined in a shared location or duplicated per app and kept in sync with this document.
- Duration: structured (e.g. hours, minutes) and/or formatted string (e.g. "0ժ 51ր") per PRD/Story 1.1.
- **Epic 8 types:** `ManagedDatabase`, `DownloadedMp3`, `LibraryEntry`, `StorageUsage` (computed) should be defined in `GrqaserApp/src/types/` and align with the mobile-specific schemas above.

## References

- PRD FR1–FR5 (crawler), FR6–FR7 (database-viewer), FR8–FR13 (GrqaserApp), **Epic 8** (local data, offline, settings), **Epic 9** (schema normalization, advanced search).
- [Epic 9 schema changes](./epic-9-schema-changes.md) — Authors and book_categories tables, migration, advanced search queries.
- [Crawler pipeline and data contract](./crawler-pipeline-and-data-contract.md) — How the crawler fills this schema.
- [Database-viewer API and deployment](./database-viewer-api-and-deployment.md) — How the viewer exposes books/stats/crawler.
- [GrqaserApp data integration and audio](./grqaserapp-data-integration-and-audio.md) — How the app consumes this data (local SQLite after Epic 8).
