# Crawler comparison and merge plan

## Feature comparison table

| Feature | crawler.js (main) | improved-crawler.js | test-crawler.js | full-database-crawler.js | fix-download-all-crawler.js |
|--------|--------------------|----------------------|------------------|---------------------------|------------------------------|
| **Discovery / source** |
| Seeds URL queue (listing pages, search, category, author) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Processes listing pages (extract book links, paginate) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Processes book detail pages from queue | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reads existing books from DB and re-crawls detail | ❌ | ✅ | ✅ (sample) | ✅ | ✅ |
| **Target selection** |
| All books needing update (no audio / Unknown Author / no cover) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Books with download-all OR missing chapter_urls OR crawl_status ≠ completed | ❌ | ❌ | ❌ | ✅ | ❌ |
| Only books with download-all (or audio but no chapter_urls) | ❌ | ❌ | ❌ | ❌ | ✅ |
| First N books from main DB (for testing) | ❌ | ❌ | ✅ (10) | ❌ | ❌ |
| **Persistence** |
| Writes to main `books` (INSERT OR REPLACE) | ✅ | ❌ (UPDATE only) | ❌ | ❌ (UPDATE only) | ❌ (UPDATE only) |
| Updates existing `books` (UPDATE by id) | ❌ | ✅ | ❌ | ✅ | ✅ |
| Writes to separate test DB / test_books table | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Schema / fields** |
| Uses shared config (crawler-config.js) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Uses shared schema (books-table, crawl-logs) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Book validation (validateBookRow) before save | ✅ | ❌ | ❌ | ❌ | ❌ |
| URL validation (validateAudioUrl, filterValidUrls) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Text cleaning (cleanText, normalizeAuthor, normalizeCategory) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Duration parsing (normalizeDurationForStorage) | ✅ | ❌ (raw string) | ❌ (raw string) | ❌ (raw string) | ❌ (raw string) |
| Persists chapter_urls (JSON array) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Persists duration as integer minutes | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Infrastructure** |
| url_queue table + queue processing | ✅ | ❌ | ❌ | ❌ | ❌ |
| crawl_logs table + optional file logging | ✅ | ❌ | ❌ | ❌ | ❌ |
| Retry with backoff for failed URLs | ✅ | ❌ | ❌ | ❌ | ❌ |
| loadExistingBooks / cleanupEbooks (dedup, remove e-books) | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Browser / concurrency** |
| Single page | ✅ | ✅ | ✅ | ❌ | ✅ |
| Multiple pages (concurrent book processing) | ❌ | ❌ | ❌ | ✅ (3) | ❌ |
| **DB path** |
| crawler/data/grqaser.db (config-driven) | ✅ | ❌ | ❌ (test DB) | ❌ | ❌ |
| database-viewer/data/grqaser.db | ❌ | ✅ | ✅ (read only for seed) | ✅ | ✅ |
| **Purpose** |
| Full catalog discovery + detail crawl | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update existing records (audio, cover, author, chapter_urls) | ❌ | ✅ | ❌ | ✅ | ✅ (download-all only) |
| Repair download-all → individual MP3 URLs | ❌ | ✅ (as part of update) | ❌ | ✅ | ✅ |
| Dev/test: run extraction on small set, write to test DB | ❌ | ❌ | ✅ | ❌ | ❌ |

---

## Summary by crawler

- **crawler.js (main)**  
  Queue-based discovery: seeds listing URLs, processes listing + book detail, saves new books with validation and shared config/schema. Does not update existing books; does not persist `chapter_urls`; uses `crawler/data/grqaser.db`.

- **improved-crawler.js**  
  Update-only: selects books missing audio/cover or “Unknown Author”, visits each detail page, updates same record (author, cover, main_audio_url, chapter_urls, has_chapters, chapter_count, crawl_status). No config, no url_queue, no crawl_logs, no validation utils. Uses `database-viewer/data/grqaser.db`.

- **test-crawler.js**  
  Dev/test: reads first 10 books from `database-viewer/data/grqaser.db`, visits each detail page, writes to `crawler/data/test_grqaser.db` into `test_books` (with chapter_urls). No config, no validation. Useful for exercising extraction without touching production data.

- **full-database-crawler.js**  
  Bulk update: selects books with download-all, or missing chapter_urls, or crawl_status ≠ completed; processes in parallel (3 pages); updates main `books` with full detail + chapter_urls. Uses `database-viewer/data/grqaser.db`. No config, no validation, no queue.

- **fix-download-all-crawler.js**  
  Narrow repair: only books with “download-all” (or audio but no chapter_urls); single page; updates same fields as full-database. Uses `database-viewer/data/grqaser.db`. No config, no validation.

---

## Recommendations

### What to remove (after merge)

- **improved-crawler.js** — Remove once “update existing” mode is implemented in main crawler (same behavior: select books to update, re-crawl detail, UPDATE books).
- **full-database-crawler.js** — Remove once “full-database update” mode exists in main crawler (same selection + optional concurrency).
- **fix-download-all-crawler.js** — Remove once “fix download-all” is a mode of the main crawler (subset of update: only download-all / missing chapter_urls).

### What to keep (for now)

- **test-crawler.js** — Keep as a lightweight dev/test runner that (a) reads a small sample from main DB and (b) writes to a test DB. Optionally later: make it a mode of the main crawler (e.g. `--mode=test --limit=10 --output-db=test_grqaser.db`) or a thin wrapper that calls main crawler in test mode.

### What to merge into main crawler (crawler.js)

1. **Modes**  
   - `full` (default): current behavior — queue-based discovery, listing + detail, INSERT/REPLACE.  
   - `update`: select existing books that need refresh (no/missing audio, Unknown Author, no cover, or configurable criteria), re-crawl detail, UPDATE by id.  
   - `fix-download-all`: like update but only books with download-all or missing chapter_urls; emphasize extracting individual MP3s and persisting chapter_urls.  
   - `full-database`: like update but broader selection (download-all OR no chapter_urls OR crawl_status ≠ completed) and optional concurrency (multiple pages).  
   - `test` (optional): limit N books, write to a test DB / test table for safe dev runs.

2. **Schema and config**  
   - Add `chapter_urls` to the canonical books schema and to main crawler’s save/update path so all modes can read/write it.  
   - Use a single config (crawler-config.js) and single DB path for all modes (or override via env/CLI for test mode). Prefer `crawler/data/grqaser.db` as default; document when to point at `database-viewer/data/grqaser.db` if needed.

3. **Extraction and validation**  
   - Reuse in all modes: `validateBookRow`, `validateAudioUrl` / `filterValidUrls`, `cleanText`, `normalizeAuthor`, `normalizeCategory`, `normalizeDurationForStorage`.  
   - Use the main crawler’s detail extraction as the single place for book detail (title, author, description, duration, cover, main_audio_url, download_url, chapter_urls, has_chapters, chapter_count). Align improved/full-database/fix-download-all extraction logic (e.g. multiple MP3 discovery methods) into this single implementation.

4. **Concurrency**  
   - Add optional multi-page concurrency for “update” / “full-database” / “fix-download-all” modes (configurable, e.g. maxConcurrentPages: 1 | 3).

5. **Logging and observability**  
   - Use crawl_logs (and optional file logging) for all modes so progress and errors are visible in one place.

---

## Status (Story 1.5 done)

A single crawler with modes is implemented and is the source of truth:

- **Entrypoint:** `crawler/src/crawler.js`. Modes: `full` (default), `update`, `fix-download-all`, `full-database`, `test`.
- **Config:** `crawler-config.js`; override via `CRAWLER_MODE` or `--mode=...`, plus `--limit`, `--output-db`, `--update-limit`, `--max-concurrent-pages`.
- **Removed:** `improved-crawler.js`, `full-database-crawler.js`, `fix-download-all-crawler.js`.
- **test-crawler.js:** Thin wrapper that runs main crawler with `--mode=test`.

See crawler README for "How to run" (full / update / fix-download-all / full-database / test).
