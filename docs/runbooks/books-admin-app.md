# Runbook: Books-admin-app

Operator runbook for running the **books-admin-app** (single admin app: crawler + database viewer). The crawler is run only via this app; there is no separate standalone crawler runbook. See [Epic 6](../prd/epic-6.md) and [testing and deployment strategy](../architecture/testing-and-deployment-strategy.md).

## Quick reference

| Item | Value |
|------|--------|
| **App location** | `books-admin-app/` |
| **Default port** | 3001 |
| **Default DB path** | `data/grqaser.db` (relative to repo root; overridable) |
| **Node** | 22+ (see `engines` in `books-admin-app/package.json`) |

## 1. Environment and config

- **Port:** `PORT` (default `3001`).
- **DB path:** `DB_PATH` overrides the active DB path when set; otherwise the active path comes from the DB registry (see Database versioning below). Crawler writes use the active path.
- **Data root:** `DB_DATA_ROOT` (default `./data`) is scanned for `db.v1`, `db.v2`, … and default `grqaser.db`.
- **Crawler DB:** When starting the crawler from the app, it uses the current active DB path; no need to set `CRAWLER_DB_PATH` unless running the crawler manually outside the app.
- **Logging:** `LOG_LEVEL` (e.g. `info`), `NODE_ENV` (`development` / `production`). Do not put secrets in env or config; see [coding standards](../architecture/coding-standards.md).

Example:

```bash
cd books-admin-app
PORT=3001 npm start
# Or override DB:
PORT=3002 DB_PATH=/path/to/grqaser.db npm start
```

## 2. Start and stop the app

```bash
cd books-admin-app
npm install
npm start
# Or with auto-reload:
npm run dev
```

Server listens on `http://localhost:3001` (or the configured port). Stop with `Ctrl+C`.

## 3. Crawler (start/stop and config via app)

Crawler is **only** run as part of books-admin-app (no separate crawler runbook).

- **Start:** Crawler tab → **Start crawler**, or `POST /api/v1/crawler/start`. Uses the **active DB path** and stored crawler config.
- **Stop:** Crawler tab → **Stop crawler**, or `POST /api/v1/crawler/stop`.
- **Config:** Crawler tab form or `GET /api/v1/crawler/config` / `PUT /api/v1/crawler/config`. Config includes mode (`full`, `update`, `fix-download-all`, `full-database`, `test`), limits, and delays; `dbPath` is always the current active path at run time.

## 4. Database versioning (Epic 6)

- One database is **active** at a time; others are **backups**. Crawler writes to the active DB; data view and API read from it.
- **Paths:** e.g. `data/db.v1/grqaser.db`, `data/db.v2/grqaser.db`, or a single `data/grqaser.db` (id `default`).
- **Set active:** Databases tab → **Set active** for a backup, or `PUT /api/v1/databases/active` with `{ "id": "db.v2" }`.
- **Delete backup:** Databases tab → **Delete backup** for a non-active DB, or `DELETE /api/v1/databases/db.v2`. The active DB cannot be deleted.

## 5. Run full crawl and validate output

1. Set crawler **mode** to `full` (Crawler tab or API).
2. **Start crawler** (Crawler tab or `POST /api/v1/crawler/start`).
3. **Validate:** Use Books tab (list/search/filters), Stats tab or `GET /api/v1/stats/overview`, Crawler tab logs, and `GET /api/v1/health`.

For a small test run, set mode to `test` and a test limit in crawler config, then start and validate the same way.

## 6. Web UI and API

- **Web UI:** `http://localhost:3001` — Dashboard, Books, Crawler, Databases, Stats.
- **API base:** `http://localhost:3001/api/v1` — books, stats, crawler (status/start/stop/config/logs), health, databases (list/set active/delete backup).

Full API and config details: [books-admin-app README](../../books-admin-app/README.md).

## 7. Tests

From repo root: `npm run admin:test`, or from `books-admin-app/`: `npm test`. Uses in-process or temporary test DBs; no dependency on Epic 6 or production data.
