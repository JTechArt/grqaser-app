# Grqaser Crawler

Node.js crawler for extracting audiobook data from grqaser.org into a SQLite database. Used by the database-viewer and GrqaserApp.

## Features

- **URL queue**: Prioritized queue with retries and status tracking
- **Concurrent processing**: Configurable concurrency
- **SQLite**: Books, URL queue, and crawl logs in `data/grqaser.db`
- **Config**: Central config in `src/config/crawler-config.js` (delays, timeouts, browser, logging)
- **Logging**: Optional file logging to `logs/` (directory is gitignored)

## Project structure

```
crawler/
├── src/
│   ├── config/
│   │   └── crawler-config.js    # Central configuration
│   ├── models/
│   │   └── database.js          # DB connection, tables, saveBook, crawl logs
│   ├── utils/
│   │   └── url-queue-manager.js  # URL queue CLI / helpers
│   ├── tests/
│   │   └── crawler.test.js      # Jest tests
│   ├── crawler.js               # Main entry (GrqaserCrawler class)
│   ├── full-database-crawler.js # Alternate full-DB crawl script
│   ├── improved-crawler.js      # Alternate crawler variant
│   ├── fix-download-all-crawler.js # One-off fix script
│   ├── test-crawler.js          # Test/demo crawl script
│   └── add-chapter-urls-column.js   # DB migration (chapter URLs)
├── data/                        # grqaser.db (create locally)
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

**Main crawler (recommended):**

```bash
npm start
# or
node src/crawler.js
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

- Crawling: `maxScrolls`, `targetBooks`, `delayBetweenScrolls`, `timeout`, `retryAttempts`, `maxConcurrentUrls`
- Browser: `headless`, `args`
- Database: path, timeout
- Logging: level, file path (under `logs/`), rotation

## Database schema (summary)

- **books**: id, title, author, description, duration, type, language, category, rating, cover_image_url, main_audio_url, download_url, crawl_status, has_chapters, etc.
- **url_queue**: url, url_type, priority, status, retry_count, max_retries, error_message
- **crawl_logs**: level, message, book_id, url, error_details

## Related

- [Database Viewer](../database-viewer/) — Web UI and API for the same DB
- [GrqaserApp](../GrqaserApp/) — React Native mobile app
