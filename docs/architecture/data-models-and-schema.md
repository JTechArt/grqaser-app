# Data models and schema

Shared data contract for the crawler (writer), database-viewer (reader), and GrqaserApp (reader). Schema is versioned and documented; the crawler is the single source of truth for updates. See [delivery order](./delivery-order-and-application-boundaries.md) for phase dependencies.

## Canonical store

- **Database:** SQLite (`grqaser.db`), path configurable (e.g. `crawler/data/grqaser.db` or `database-viewer/data/grqaser.db` when copied).
- **Writer:** Crawler only. Database-viewer and GrqaserApp never write to this DB in MVP.
- **Schema ownership:** Defined and evolved in Phase 1; documented here for viewer and app.

## Core entities (summary)

### Books

- **Purpose:** Audiobook catalog entry from grqaser.org.
- **Key attributes (align with crawler implementation):** id, title, author, description, duration (structured or formatted), type, language, category, rating, cover_image_url, main_audio_url, download_url, crawl_status, has_chapters, chapter_count, chapter_urls (Story 1.5). Normalized: no HTML in text fields, consistent encoding, unique IDs.
- **Relationships:** Categories and authors may be normalized into separate tables or stored as columns per PRD/Epic 1; relationships must support filtering and stats in database-viewer and GrqaserApp.

### URL queue (crawler-internal)

- **Purpose:** Prioritized queue for crawl URLs, retries, status.
- **Key attributes:** url, url_type, priority, status, retry_count, max_retries, error_message. Used by crawler and exposed read-only via database-viewer crawler status API if required.

### Crawl logs (crawler-internal)

- **Purpose:** Crawl run logs for debugging and monitoring.
- **Key attributes:** level, message, book_id, url, error_details. Exposed via database-viewer crawler logs API if required.

## Books table (DDL)

**Single source of truth:** `crawler/src/schema/books-table.js` — both `crawler/src/models/database.js` and `crawler/src/crawler.js` use this module to create the books table and avoid schema drift.

Current canonical schema:

| Column | Type | Constraints | Notes |
|--------|------|--------------|--------|
| id | INTEGER | PRIMARY KEY | Unique book ID from source (numeric or string coerced). |
| title | VARCHAR(500) | NOT NULL | No HTML; cleaned before write. |
| author | VARCHAR(200) | DEFAULT 'Unknown Author' | No HTML. |
| description | TEXT | | No HTML; cleaned. |
| duration | INTEGER | | Total minutes (from duration parser). |
| duration_formatted | TEXT | | Display string (e.g. "0ժ 51ր"). |
| type | VARCHAR(50) | DEFAULT 'audiobook' | |
| language | VARCHAR(10) | DEFAULT 'hy' | |
| category | VARCHAR(100) | DEFAULT 'Unknown' | Genre/category; no HTML. |
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

**Required for insert:** id, title, author. All text fields must be free of HTML; URLs must pass scheme validation (http/https).

**Validation before write (Story 1.6):** The crawler enforces: non-empty `main_audio_url`, duration ≥ 0, rating in 0–5, `rating_count` non-negative integer, language length ≤ 10, non-empty title. Invalid rows are skipped with reasons logged. Deduplication is by book id and by (title|author); duplicates are skipped and counted.

**Filtering and stats (Story 1.3):** Category and author columns support filtering (e.g. `WHERE category = ?`, `WHERE author = ?`) and aggregates (e.g. `GROUP BY category`, `GROUP BY author`). The Database model exposes `getBooksByCategory`, `getBooksByAuthor`, `getCategoryCounts`, `getAuthorCounts` for database-viewer and GrqaserApp.

## Schema documentation and versioning

- Schema (tables, columns, constraints) must be **documented and versioned** (Epic 1, Story 1.4).
- **Current schema version: 1.** The crawler creates a `schema_version` table with a single row `(version INTEGER)` so database-viewer and GrqaserApp can align (e.g. `SELECT version FROM schema_version`).
- All three applications must use the same schema; any change is made in the crawler first, then reflected in viewer and app consumption.
- Required fields and types must be validated before write in the crawler; invalid rows logged/skipped.

## TypeScript / client types

- GrqaserApp and database-viewer API responses should align with this schema. Shared types (e.g. `Book`, duration shape) can be defined in a shared location or duplicated per app and kept in sync with this document.
- Duration: structured (e.g. hours, minutes) and/or formatted string (e.g. "0ժ 51ր") per PRD/Story 1.1.

## References

- PRD FR1–FR5 (crawler), FR6–FR7 (database-viewer), FR8–FR13 (GrqaserApp).
- [Crawler pipeline and data contract](./crawler-pipeline-and-data-contract.md) — How the crawler fills this schema.
- [Database-viewer API and deployment](./database-viewer-api-and-deployment.md) — How the viewer exposes books/stats/crawler.
- [GrqaserApp data integration and audio](./grqaserapp-data-integration-and-audio.md) — How the app consumes this data.
