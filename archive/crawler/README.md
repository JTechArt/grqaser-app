# Grqaser Crawler

Node.js crawler for extracting audiobook data from grqaser.org into a SQLite database. Used by the database-viewer and GrqaserApp. Single entrypoint with configurable modes.

## Features

- **Modes**: full (discovery), update, fix-download-all, full-database, test
- **URL queue**: Prioritized queue with retries and status tracking (full mode)
- **Concurrent processing**: Configurable concurrency; optional multi-page for update modes
- **SQLite**: Books, URL queue, and crawl logs in `data/grqaser.db`
- **Config**: Central config in `src/config/crawler-config.js`; override via env or CLI
- **Logging**: All modes write to crawl_logs and optional file logging under `logs/`

## How to run

| Mode | Command | Purpose |
|------|---------|---------|
| **full** (default) | `npm start` or `node src/crawler.js` | Queue-based discovery: listing + detail, INSERT OR REPLACE |
| **update** | `node src/crawler.js --mode=update` | Re-crawl books missing audio/cover or "Unknown Author"; UPDATE by id |
| **fix-download-all** | `node src/crawler.js --mode=fix-download-all` | Re-crawl books with download-all or missing chapter_urls; UPDATE with individual MP3s and chapter_urls |
| **full-database** | `node src/crawler.js --mode=full-database` | Re-crawl books with download-all OR no chapter_urls OR crawl_status ≠ completed; optional `--max-concurrent-pages=N` |
| **test** | `node src/crawler.js --mode=test` or `node src/test-crawler.js` | Limit N books, write to test DB (default `data/test_grqaser.db`); no change to main books |

**CLI options:** `--mode=...`, `--limit=N` (test mode), `--output-db=path` (test), `--update-limit=N`, `--max-concurrent-pages=N`.

**Env:** `CRAWLER_MODE`, `CRAWLER_TEST_LIMIT`, `CRAWLER_TEST_DB_PATH`, `CRAWLER_UPDATE_LIMIT`, `CRAWLER_MAX_CONCURRENT_PAGES`.

## Project structure

```
crawler/
├── src/
│   ├── config/
│   │   └── crawler-config.js    # Central configuration (mode, paths, crawling, browser, logging)
│   ├── schema/
│   │   ├── books-table.js       # Books DDL (includes chapter_urls)
│   │   └── crawl-logs-table.js
│   ├── models/
│   │   └── database.js          # DB connection, tables
│   ├── utils/
│   │   └── url-queue-manager.js
│   ├── tests/
│   │   └── ...                 # Jest tests
│   ├── crawler.js               # Main entry (single crawler with modes)
│   ├── test-crawler.js          # Thin wrapper: runs main crawler --mode=test
│   └── add-chapter-urls-column.js   # Optional migration for existing DBs
├── data/                        # grqaser.db, test_grqaser.db
├── logs/                        # crawler.log (gitignored)
├── package.json
└── README.md
```

## Setup

```bash
npm install
mkdir -p data logs
```

## Usage

**Full crawl (discovery):**

```bash
npm start
# or
node src/crawler.js
```

**Update / repair modes (use same config and DB path):**

```bash
node src/crawler.js --mode=update --update-limit=50
node src/crawler.js --mode=fix-download-all
node src/crawler.js --mode=full-database --max-concurrent-pages=3
```

**Test mode (writes to test DB only):**

```bash
node src/test-crawler.js
node src/crawler.js --mode=test --limit=5 --output-db=data/test_grqaser.db
```

**Environment:**

- `NODE_ENV=development` — debug logging, lower concurrency
- `NODE_ENV=production` — info logging, higher concurrency

**Tests:**

```bash
npm test
```

## Configuration

Edit `src/config/crawler-config.js` for:

- **Mode**: `mode` (full | update | fix-download-all | full-database | test), `testLimit`, `testDbPath`, `updateLimit`, `maxConcurrentPages`
- **Crawling**: `maxScrolls`, `targetBooks`, `delayBetweenScrolls`, `timeout`, `retryAttempts`, `maxConcurrentUrls`
- **Browser**: `headless`, `args`
- **Database**: path, timeout
- **Logging**: level, file path (under `logs/`), rotation

## Database schema (summary)

- **books**: id, title, author, description, duration, type, language, category, rating, cover_image_url, main_audio_url, download_url, crawl_status, has_chapters, chapter_count, chapter_urls, etc.
- **url_queue**: url, url_type, priority, status, retry_count, max_retries, error_message
- **crawl_logs**: level, message, book_id, url, error_details

## Related

- [Database Viewer](../database-viewer/) — Web UI and API for the same DB
- [GrqaserApp](../GrqaserApp/) — React Native mobile app
