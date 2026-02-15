## Crawler JS file map

### Core crawlers
- `src/crawler.js` — **Single entrypoint** with modes: `full` (queue-based discovery), `update`, `fix-download-all`, `full-database`, `test`. Uses `crawler-config.js`, shared schema, validation, and crawl_logs. See `learning/crawler-comparison-and-merge.md` and story `docs/stories/1.5.unified-crawler-modes.md`.
- `src/test-crawler.js` — Thin wrapper that runs main crawler with `--mode=test` and default test DB (no change to main books).

### Config & schema
- `src/config/crawler-config.js` — base config plus per-environment overrides (crawling, browser, logging, seeds, paths).
- `src/schema/books-table.js` — SQL DDL for the `books` table.
- `src/schema/crawl-logs-table.js` — SQL DDL for the `crawl_logs` table.
- `src/add-chapter-urls-column.js` — migration helper to add chapter URL support columns.

### Data access / helpers
- `src/models/database.js` — SQLite connection and basic helpers for DB operations.
- `src/utils/url-queue-manager.js` — CLI tool to inspect/manage `url_queue` (view pending/failed/completed, reset, add/delete URLs).

### Parsing & validation utils
- `src/utils/duration-parser.js` — parse Armenian duration strings (ժ/ր) and normalize total minutes.
- `src/utils/text-cleaner.js` — strip HTML, decode entities, normalize author/category strings.
- `src/utils/url-validator.js` — validate audio/download URLs (http/https scheme) and filter lists.
- `src/utils/book-validator.js` — schema guard for book rows (required fields, rating/duration bounds, language length, audio URL validity).

### Tests
- `src/tests/crawler.test.js` — coverage for crawler flows and queue behaviors.
- `src/tests/database.integration.test.js` — integration coverage for SQLite interactions.
- `src/tests/config-rate-limit.test.js` — verifies rate-limit/backoff config behavior.
- `src/tests/book-validator.test.js` — validates book schema guard logic.
- `src/tests/url-validator.test.js` — validates URL filtering/scheme checks.
- `src/tests/duration-parser.test.js` — validates duration parsing/normalization.
- `src/tests/text-cleaner.test.js` — validates text cleaning/normalization.

### Legacy/backups
- `backup-old-files/test-url-queue.js` — legacy queue runner/checker.
- `backup-old-files/test-audiobooks.js` — older audiobook crawler experiment.
- `backup-old-files/test-sequential.js` — older sequential crawl experiment.

### Tooling
- `jest.config.js` — Jest configuration for crawler-related tests.
