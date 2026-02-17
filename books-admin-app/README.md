# Grqaser Books Admin App

Merged application combining the **crawler** and **database-viewer**. One process provides the REST API, web UI, and crawler capability (as an in-process library). No authentication; local-only.

## Run

```bash
# Install dependencies (includes crawler from repo)
npm install

# Start server (API + static UI)
npm start
# or with auto-reload
npm run dev
```

Server listens on `http://localhost:3001` by default.

## Configuration

Externalized via environment variables (and defaults in `src/config/config.js`):

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | 3001 |
| `HOST` | Bind host | localhost |
| `DB_PATH` | SQLite database path (viewer API; Story 6.2 will add versioning) | `./data/grqaser.db` |
| `CRAWLER_DB_PATH` | DB path used when running crawler from this app | same as `DB_PATH` if set |
| `LOG_LEVEL` | Logging level | info |
| `NODE_ENV` | development / production | development |

Example:

```bash
PORT=3002 DB_PATH=/path/to/grqaser.db npm start
```

## API

Same as database-viewer:

- `GET /api/v1/books` — list books (pagination, filters)
- `GET /api/v1/books/search?q=...` — search
- `GET /api/v1/books/:id` — book by ID
- `GET /api/v1/stats/overview` — overview stats
- `GET /api/v1/stats/authors` — authors stats
- `GET /api/v1/stats/categories` — categories stats
- `GET /api/v1/crawler/status` — crawler status
- `GET /api/v1/crawler/urls` — URL queue
- `GET /api/v1/crawler/logs` — crawl logs
- `GET /api/v1/health` — health (and DB connectivity)

## Crawler

Crawler is integrated as a **library** (dependency `grqaser-crawler` from `../crawler`). To run a crawl (e.g. test mode) use the crawler directly from the repo:

```bash
# From repo root
cd crawler
CRAWLER_MODE=test node src/crawler.js --limit=2
```

Or set `DB_PATH` / `CRAWLER_DB_PATH` so crawler and viewer use the same DB when you run the crawler from `crawler/`. Story 6.2 will address DB path and versioning.

## Tests

Requires **Node 22+** (see `engines` in package.json and `.nvmrc`). If sqlite3 native bindings fail, run `npm rebuild` or use Node 22 (e.g. `nvm use` when using nvm). CI should use Node 22 to run tests.

```bash
npm test
```

## Integration

See [INTEGRATION.md](./INTEGRATION.md) for how crawler and viewer are merged (single process, crawler as in-process library).
