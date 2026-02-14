# Data models and schema

Shared data contract for the crawler (writer), database-viewer (reader), and GrqaserApp (reader). Schema is versioned and documented; the crawler is the single source of truth for updates. See [delivery order](./delivery-order-and-application-boundaries.md) for phase dependencies.

## Canonical store

- **Database:** SQLite (`grqaser.db`), path configurable (e.g. `crawler/data/grqaser.db` or `database-viewer/data/grqaser.db` when copied).
- **Writer:** Crawler only. Database-viewer and GrqaserApp never write to this DB in MVP.
- **Schema ownership:** Defined and evolved in Phase 1; documented here for viewer and app.

## Core entities (summary)

### Books

- **Purpose:** Audiobook catalog entry from grqaser.org.
- **Key attributes (align with crawler implementation):** id, title, author, description, duration (structured or formatted), type, language, category, rating, cover_image_url, main_audio_url, download_url, crawl_status, has_chapters, chapter URLs where applicable. Normalized: no HTML in text fields, consistent encoding, unique IDs.
- **Relationships:** Categories and authors may be normalized into separate tables or stored as columns per PRD/Epic 1; relationships must support filtering and stats in database-viewer and GrqaserApp.

### URL queue (crawler-internal)

- **Purpose:** Prioritized queue for crawl URLs, retries, status.
- **Key attributes:** url, url_type, priority, status, retry_count, max_retries, error_message. Used by crawler and exposed read-only via database-viewer crawler status API if required.

### Crawl logs (crawler-internal)

- **Purpose:** Crawl run logs for debugging and monitoring.
- **Key attributes:** level, message, book_id, url, error_details. Exposed via database-viewer crawler logs API if required.

## Schema documentation and versioning

- Schema (tables, columns, constraints) must be **documented and versioned** (Epic 1, Story 1.4).
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
