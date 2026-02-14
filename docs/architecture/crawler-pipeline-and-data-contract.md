# Crawler pipeline and data contract

**Phase 1 application.** The data crawler is the single pipeline that updates the project’s canonical data. It must be finalized and validated before any Phase 2 (database-viewer) work. See [delivery order and application boundaries](./delivery-order-and-application-boundaries.md).

## Role and boundaries

- **Responsibility:** Extract audiobook metadata and audio URLs from grqaser.org, normalize and validate data, write to SQLite. Produce clean, documented schema for database-viewer and GrqaserApp.
- **Does not:** Call database-viewer or GrqaserApp. No dependency on Phase 2 or 3.
- **Output:** SQLite database (`grqaser.db`) in agreed location; schema documented and versioned.

## Pipeline overview

1. **Discovery:** Listing pages, pagination, optional search and category/author traversal (Epic 1 stories).
2. **Extraction:** Per book: metadata (title, author, description, duration, categories, ratings, language), audio URLs from detail pages. Duration parsed to structured format; audio URLs validated and stored.
3. **Normalization and validation:** Clean text (no HTML, consistent encoding), unique IDs, required-field and type validation; invalid rows logged/skipped.
4. **Persistence:** Write to SQLite against fixed, versioned schema. Support full catalog (target 950+ books), deduplication, configurable rate limiting and retries.

## Technical choices

- **Runtime:** Node.js. **Browser automation:** Puppeteer (or equivalent). **Store:** SQLite. **Config:** `src/config/crawler-config.js` (delays, timeouts, concurrency, DB path, logging).
- **NFRs:** Timeouts and retries (e.g. 30s timeout, 3 retries), error logging. Optional file logging under `logs/`.

## Data contract

- Schema and types are the shared contract. See [Data models and schema](./data-models-and-schema.md).
- Crawler is the only writer. Database-viewer and GrqaserApp consume the same DB (viewer) or data derived from it (app via API/export).
- Phase 1 complete when: crawler runs successfully, full catalog (or agreed target) is in the DB, schema is documented, and data quality is accepted (no missing required fields, audio URLs valid where expected).

## Project structure (crawler)

- **Entry:** `crawler/src/crawler.js` (or main script). Config: `crawler/src/config/crawler-config.js`. DB access: `crawler/src/models/database.js`. URL queue: `crawler/src/utils/url-queue-manager.js`.
- **Data:** `crawler/data/grqaser.db`. **Logs:** `crawler/logs/` (optional, gitignored).

## References

- Epic 1 (Crawler pipeline and data contract); Stories 1.1–1.4.
- [Tech stack](./tech-stack.md) — Crawler row.
- [Testing and deployment strategy](./testing-and-deployment-strategy.md) — Crawler tests and runbooks.
