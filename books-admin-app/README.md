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
- `PATCH /api/v1/books/:id` — update a book (editable fields; in-place UPDATE; sets `last_edited_at`)
- `GET /api/v1/stats/overview` — overview stats
- `GET /api/v1/stats/authors` — authors stats
- `GET /api/v1/stats/categories` — categories stats
- `GET /api/v1/crawler/status` — crawler status (includes `is_running`, `last_run_started_at`)
- `POST /api/v1/crawler/start` — start crawler (uses active DB path and stored config)
- `POST /api/v1/crawler/stop` — stop running crawler
- `GET /api/v1/crawler/config` — get crawler config (mode, limits, delays; `dbPath` is current active path)
- `PUT /api/v1/crawler/config` — save crawler config (applies to next run)
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

## Crawler control and config (Story 6.3)

You can **start** and **stop** the crawler from the app (Crawler tab or API). The crawler runs as a **subprocess**; only one run at a time.

- **Start:** `POST /api/v1/crawler/start` or the **Start crawler** button. Uses the **active DB path** (from Database versioning) and the stored crawler config (mode, test limit, update limit, etc.).
- **Stop:** `POST /api/v1/crawler/stop` or **Stop crawler**. Sends SIGTERM to the crawler process.
- **Config:** View or edit via `GET /api/v1/crawler/config` and `PUT /api/v1/crawler/config`, or the form on the Crawler tab. Config is stored in `data/crawler-config.json`; `dbPath` is always the current active path at run time (not persisted in the file). Valid mode: `full`, `update`, `fix-download-all`, `full-database`, `test`.
- **Status and logs:** Crawler status (running/stopped, last run, book counts) and logs remain available; refresh to see updates.

To run the crawler manually from the repo (e.g. for debugging), set `CRAWLER_DB_PATH` or `DB_PATH` to the active path so writes go to the same DB the viewer reads.

## Data management (view and edit)

The data view (list, detail, search, filters) reads from the **active database** (Story 6.2). You can **edit** any book from the detail modal.

- **View:** Books tab shows the list; click a book to open the detail modal. All data comes from the active DB.
- **Edit:** In the book detail modal, click **Edit book** to switch to the edit form. Change title, author, description, category, language, type, duration, rating, cover/audio/download URLs; click **Save** to persist. Changes are applied in place (UPDATE by id); the modal and list refresh with the updated data. No duplicate records are created.
- **Manual edit indicator:** When a book has been manually edited, the detail view shows **Last edited (manual)** in the Timestamps section (`last_edited_at`). Local-only; no authentication.

Validation: title required and non-empty; URLs must be http/https if present; duration ≥ 0; rating 0–5; language max length 10.

## Tests

Requires **Node 22+** (see `engines` in package.json and `.nvmrc`). If sqlite3 native bindings fail, run `npm rebuild` or use Node 22 (e.g. `nvm use` when using nvm). CI should use Node 22 to run tests.

```bash
npm test
```

## UI/UX mockups (Epic 7)

Design mockups live in the **main docs folder** and use the same design system as GrqaserApp (slate + teal, Plus Jakarta Sans):

- **Design hub:** [docs/design/index.html](../docs/design/index.html) — entry to all mockups (Books Admin App and GrqaserApp).
- **Books Admin App mockups:** [docs/design/books-admin-app/](../docs/design/books-admin-app/) — Dashboard, Books, Crawler, Databases, Book detail & edit.

Full UI/UX spec: [docs/books-admin-app-ui-ux-mockups.md](../docs/books-admin-app-ui-ux-mockups.md).

## Integration

See [INTEGRATION.md](./INTEGRATION.md) for how crawler and viewer are merged (single process, crawler as in-process library).
