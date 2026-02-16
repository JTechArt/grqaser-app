# Crawler pipeline and data contract

**Phase 1 application.** The data crawler is the single pipeline that updates the project’s canonical data. It must be finalized and validated before any Phase 2 (database-viewer) work. See [delivery order and application boundaries](./delivery-order-and-application-boundaries.md).

## Role and boundaries

- **Responsibility:** Extract audiobook metadata and audio URLs from grqaser.org, normalize and validate data, write to SQLite. Produce clean, documented schema for database-viewer and GrqaserApp.
- **Does not:** Call database-viewer or GrqaserApp. No dependency on Phase 2 or 3.
- **Output:** SQLite database (`grqaser.db`) in agreed location; schema documented and versioned.

## Pipeline overview

1. **Discovery:** Listing pages, pagination, optional search and category/author traversal (Epic 1 stories).
2. **Extraction:** Per book: metadata (title, author, description, duration, categories, ratings, language), audio URLs from detail pages. Duration parsed to structured format; audio URLs validated and stored.
3. **Normalization and validation:** Clean text (no HTML, consistent encoding), unique IDs, required-field and type validation; invalid rows logged/skipped. See [Validation rules](#validation-and-dedup) for enforced bounds.
4. **Persistence:** Write to SQLite against fixed, versioned schema. Support full catalog (target 950+ books), deduplication (by book id and by title|author), configurable rate limiting and retries.

## Crawler modes (Story 1.5)

A single entrypoint (`crawler/src/crawler.js`) supports configurable modes via `crawler-config.js` or CLI/env (e.g. `CRAWLER_MODE`, `--mode=`):

| Mode | Behavior |
|------|----------|
| **full** (default) | Queue-based discovery: listing + detail, INSERT OR REPLACE; target books and limits from config. |
| **update** | Select existing books needing refresh (e.g. no/missing audio, Unknown Author, no cover); re-crawl detail; UPDATE by id; optional limit. |
| **fix-download-all** | Select books with download-all or missing chapter_urls; re-crawl and UPDATE with individual MP3 URLs and chapter_urls. |
| **full-database** | Select books with download-all OR missing chapter_urls OR crawl_status ≠ completed; re-crawl and UPDATE; optional multi-page concurrency. |
| **test** | Limit N books from DB, run detail extraction, write to test DB or test table (no writes to main books). |

All modes use the same config (`crawler-config.js` and env overrides), same schema, same extraction and validation (e.g. validateBookRow, cleanText, normalizeAuthor, normalizeDurationForStorage). All modes write to `crawl_logs` (and optional file logging) for a single place to observe progress and errors. Redundant scripts (`improved-crawler.js`, `full-database-crawler.js`, `fix-download-all-crawler.js`) are removed in favor of this single crawler; `test-crawler.js` may remain as a thin wrapper invoking the main crawler with `--mode=test`.

## Config and environment (Story 1.6)

- **Config merge:** Base config is deep-merged with `environments[NODE_ENV]`; crawler launch uses the merged browser, logging, and crawling settings.
- **Override:** DB path, mode, and other options can be set via env (e.g. `CRAWLER_MODE`, `NODE_ENV`) or CLI so operators can tune behavior per environment without editing config files.

## Retries and backoff (Story 1.6)

- **Retry discipline:** URL retries increment once per attempt and use exponential backoff with jitter before retrying. Inter-page delay uses a shared sleep helper (e.g. `delayBetweenPages`).
- **Observability:** Logs include retry attempt count and backoff duration; queue summary reports processed/completed/failed with books_found/saved averages.

## Validation and dedup (Story 1.6)

- **Book validation:** Before write, enforce: non-empty `main_audio_url`, duration ≥ 0, rating in 0–5, rating_count non-negative integer, language length ≤ 10, non-empty title. Invalid rows are skipped with reasons logged.
- **Dedup:** Crawler skips duplicates by both (title|author) and book id; counters reflect duplicates skipped.

## Technical choices

- **Runtime:** Node.js. **Browser automation:** Puppeteer (or equivalent). **Store:** SQLite. **Config:** `src/config/crawler-config.js` (delays, timeouts, concurrency, DB path, logging, mode); merged with `environments[NODE_ENV]`.
- **NFRs:** Timeouts and retries with exponential backoff and jitter; error and retry logging; optional file logging under `logs/`.

## Data contract

- Schema and types are the shared contract. See [Data models and schema](./data-models-and-schema.md).
- Crawler is the only writer. Database-viewer and GrqaserApp consume the same DB (viewer) or data derived from it (app via API/export).
- Phase 1 complete when: crawler runs successfully, full catalog (or agreed target) is in the DB, schema is documented, and data quality is accepted (no missing required fields, audio URLs valid where expected).

## Project structure (crawler)

- **Entry:** `crawler/src/crawler.js` (single script; mode selected via config/CLI). Config: `crawler/src/config/crawler-config.js`. Schema: `crawler/src/schema/books-table.js`. DB access: `crawler/src/models/database.js`. URL queue: `crawler/src/utils/url-queue-manager.js`. Utils: `book-validator.js`, `url-validator.js`, `text-cleaner.js`, `duration-parser.js`.
- **Data:** `crawler/data/grqaser.db`. **Logs:** `crawler/logs/` (optional, gitignored). Test mode may use a separate DB path or test table.

## References

- Epic 1 (Crawler pipeline and data contract); Stories 1.1–1.6.
- [Tech stack](./tech-stack.md) — Crawler row.
- [Testing and deployment strategy](./testing-and-deployment-strategy.md) — Crawler tests and runbooks.
