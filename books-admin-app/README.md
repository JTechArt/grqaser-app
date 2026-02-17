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
| `DB_PATH` | Override active DB path (e.g. tests); otherwise active path comes from registry | `./data/grqaser.db` |
| `DB_DATA_ROOT` | Directory scanned for `db.v*` and default `grqaser.db` | `./data` |
| `CRAWLER_DB_PATH` | DB path used when running crawler; set to active path when crawler is started from app | same as active DB |
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
- `GET /api/v1/databases` — list known DBs (active + backups)
- `PUT /api/v1/databases/active` — set active DB (body: `{ "id": "db.v1" }` or `{ "path": "/abs/path" }`)
- `DELETE /api/v1/databases/:id` — delete a backup DB (cannot delete active)

## Database versioning

One database is **active** at a time; all others are **backups**. The crawler writes to the active DB; the data view and API read from it.

- **Paths:** Use versioned paths such as `db.v1`, `db.v2` under the data root. Place each DB as `data/db.v1/grqaser.db`, or use a single default `data/grqaser.db` (id `default`).
- **Add a DB:** Create a directory `data/db.v2/` and put `grqaser.db` inside (e.g. copy from another version or run crawler with that path). The app discovers it on next list.
- **Set active:** In the UI (Databases tab) click **Set active** for a backup, or call `PUT /api/v1/databases/active` with `{ "id": "db.v2" }`. The server reconnects to the new DB; subsequent crawler runs and data view use it.
- **Delete backup:** In the UI click **Delete backup** for a non-active DB, or `DELETE /api/v1/databases/db.v2`. The active DB cannot be deleted.
- **Registry:** The active path is stored in `data/db-registry.json` and survives restarts.

## Crawler

Crawler is integrated as a **library** (dependency `grqaser-crawler` from `../crawler`). To run a crawl (e.g. test mode) use the crawler directly from the repo:

```bash
# From repo root
cd crawler
CRAWLER_MODE=test node src/crawler.js --limit=2
```

When running the crawler from this app (or from `crawler/`), set `CRAWLER_DB_PATH` (or `DB_PATH`) to the **active** DB path so writes go to the same DB the viewer reads. The app uses the active path from the DB registry when the crawler is started via the app.

## Tests

Requires **Node 22+** (see `engines` in package.json and `.nvmrc`). If sqlite3 native bindings fail, run `npm rebuild` or use Node 22 (e.g. `nvm use` when using nvm). CI should use Node 22 to run tests.

```bash
npm test
```

## Integration

See [INTEGRATION.md](./INTEGRATION.md) for how crawler and viewer are merged (single process, crawler as in-process library).
