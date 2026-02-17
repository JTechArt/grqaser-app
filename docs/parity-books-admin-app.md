# Parity: books-admin-app vs Epic 1 (Crawler) and Epic 2 (Database-viewer)

This document maps each Epic 1 and Epic 2 story/acceptance criterion to the corresponding books-admin-app feature or behavior, and records where each behavior is implemented. It supports **Story 7.1** (verify functional parity) and enables **Epic 5** verification and **Story 7.2** (removal of standalone crawler and database-viewer) to proceed safely.

**References:** [Books-admin-app architecture](architecture/books-admin-app-architecture.md), [Crawler pipeline and data contract](architecture/crawler-pipeline-and-data-contract.md), [Database-viewer API and deployment](architecture/database-viewer-api-and-deployment.md), [Delivery order and application boundaries](architecture/delivery-order-and-application-boundaries.md).

---

## 1. Epic 1 (Crawler) parity

Crawler behavior is **preserved** in books-admin-app by running the **same crawler pipeline** as a **subprocess** (package `grqaser-crawler`, from `crawler/`). The app supplies the **active DB path** (Story 6.2) and **crawler config** (Story 6.3); the crawler writes to the active DB and uses the same schema, validation, and modes as documented in the crawler architecture.

### 1.1 Story 1.1 — Metadata and audio URLs

| Epic 1 AC | books-admin-app feature / behavior | Implementation location |
|-----------|------------------------------------|--------------------------|
| Duration parsed (structured format) | Crawler extracts and stores duration; API and UI expose it | **Crawler:** `crawler/` (grqaser-crawler). **App:** invokes via `books-admin-app/src/services/crawler-runner.js`; config `books-admin-app/src/services/crawler-config-store.js`; active DB from `books-admin-app/src/models/db-registry.js`. Books API and UI read from active DB: `books-admin-app/src/routes/books.js`, `books-admin-app/src/models/database.js`, `books-admin-app/public/index.html`. |
| Audio URLs extracted, validated, stored | Same crawler pipeline; writes to active DB | Same as above. |
| Categories, ratings, descriptions, language | Same crawler pipeline; schema and data contract unchanged | Same as above. |
| Output schema documented, consistent | Same schema; docs in `docs/architecture/data-models-and-schema.md` | Crawler writes to SQLite per schema; books-admin-app reads via `database.js`. |

**Verification:** Run crawler from app (POST `/api/v1/crawler/start`); confirm books in DB have duration, main_audio_url, category, etc. List/detail via GET `/api/v1/books`, GET `/api/v1/books/:id`.

### 1.2 Story 1.2 — Full catalog and pagination

| Epic 1 AC | books-admin-app feature / behavior | Implementation location |
|-----------|------------------------------------|--------------------------|
| Listing and detail pagination, rate limiting | Crawler modes (full, update, etc.) and config; app passes DB path and config to subprocess | **Crawler:** `crawler/` (grqaser-crawler). **App:** `crawler-runner.js` (spawn with `CRAWLER_DB_PATH`, `CRAWLER_MODE`); `crawler-config-store.js`; `routes/crawler.js` (GET/PUT `/config`, POST `/start`). |
| Full target catalog; duplicates avoided | Same crawler logic; single active DB per run | Active DB from `db-registry.getActivePath()` passed to crawler. |
| Progress and errors loggable | Crawler writes to DB; app exposes logs API | `models/database.js` (`getCrawlLogs`); `routes/crawler.js` GET `/api/v1/crawler/logs`. Web UI: `public/index.html` (crawler section). |

**Verification:** Start crawler from UI or API; check GET `/api/v1/crawler/status`, GET `/api/v1/crawler/logs`; confirm books list pagination (GET `/api/v1/books?page=1&limit=20`).

### 1.3 Story 1.3 — Search and categories/authors

| Epic 1 AC | books-admin-app feature / behavior | Implementation location |
|-----------|------------------------------------|--------------------------|
| Search flow; results merged without duplicates | Crawler implements search; catalog in single DB | Crawler in `crawler/`. App runs crawler with active DB; no change to crawler behavior. |
| Categories and authors extracted and linked | Same crawler pipeline; schema has category, author | Same. Stats and filters in app use same schema: `routes/stats.js` (authors, categories), `routes/books.js` (filters: author, category). |
| Relationships for filtering and stats | API supports filters and stats from active DB | `routes/books.js` (query params: author, category, crawl_status, etc.); `routes/stats.js` (overview, authors, categories); `models/database.js` (`getBooks`, `getCrawlStats`, `getAuthorsStats`, raw SQL for categories). |

**Verification:** GET `/api/v1/books?category=...`, GET `/api/v1/books?author=...`, GET `/api/v1/stats/authors`, GET `/api/v1/stats/categories`; search GET `/api/v1/books/search?q=...`.

### 1.4 Story 1.4 — Data cleaning, validation, schema

| Epic 1 AC | books-admin-app feature / behavior | Implementation location |
|-----------|------------------------------------|--------------------------|
| Text cleaned (no HTML, normalized encoding) | Same crawler validation and cleaning | Crawler in `crawler/` (same pipeline). |
| Required fields validated before write; invalid rows logged/skipped | Same crawler validation | Same. |
| Schema documented and versioned | Same schema; docs in architecture | `docs/architecture/data-models-and-schema.md`; crawler and app share schema. |
| Data written to SQLite in agreed location | Crawler writes to **active DB** path provided by app | `db-registry.getActivePath()`; passed to crawler via `crawler-runner.js` (env `CRAWLER_DB_PATH`). Config and active DB per Stories 6.2 and 6.3. |

**Verification:** Run crawler; inspect DB and API responses for required fields and types; confirm active DB path in GET `/api/v1/crawler/config` (dbPath).

### 1.5 Config and active DB (Stories 6.2, 6.3)

- **Active DB:** `books-admin-app/src/models/db-registry.js` — `getActivePath()`, `setActivePath()`, `listDatabases()`; persisted in `db-registry.json` under data root.
- **Crawler config:** `books-admin-app/src/services/crawler-config-store.js` — load/save/validate; `books-admin-app/src/routes/crawler.js` — GET/PUT `/api/v1/crawler/config`. Config includes mode, limits; active DB path is merged at start (crawler-runner).
- **Crawler start/stop:** `books-admin-app/src/services/crawler-runner.js` — `startCrawler(config)`, `stopCrawler()`; `routes/crawler.js` — POST `/api/v1/crawler/start`, POST `/api/v1/crawler/stop`.

---

## 2. Epic 2 (Database-viewer) parity

All Epic 2 API and web UI behaviors are implemented **inside books-admin-app**; all read from (or write to) the **active DB** via the same models and routes.

### 2.1 Story 2.1 — Books API and stats API

| Epic 2 AC | books-admin-app API | Implementation location |
|-----------|----------------------|--------------------------|
| GET /api/v1/books (list, pagination/filters) | GET `/api/v1/books` with page, limit, author, category, crawl_status, type, duration_min/max, sort_by, sort_order | `books-admin-app/src/routes/books.js` (GET `/`); `models/database.js` (`getBooks`). |
| GET /api/v1/books/:id | GET `/api/v1/books/:id` | `routes/books.js` (GET `/:id`); `models/database.js` (`getBookById`). |
| GET /api/v1/books/search?q=... | GET `/api/v1/books/search?q=...` (with page, limit) | `routes/books.js` (GET `/search`); `models/database.js` (`searchBooks`). |
| Stats (overview, authors, categories) | GET `/api/v1/stats/overview`, `/api/v1/stats/authors`, `/api/v1/stats/categories` | `routes/stats.js`; `models/database.js` (`getCrawlStats`, `getAuthorsStats`, categories query). |

**Verification:** Call each endpoint; confirm JSON shape and that data comes from active DB.

### 2.2 Story 2.2 — Crawler status API and health

| Epic 2 AC | books-admin-app API | Implementation location |
|-----------|----------------------|--------------------------|
| Crawler status, URL queue, logs | GET `/api/v1/crawler/status`, GET `/api/v1/crawler/urls`, GET `/api/v1/crawler/logs` | `routes/crawler.js`; `models/database.js` (`getCrawlStats`, `getUrlQueueStatus`, `getCrawlLogs`); `crawler-runner.js` (isRunning, last run times). |
| GET /api/v1/health (service + DB) | GET `/api/v1/health` — success, data.status (healthy/degraded), data.database (connected/disconnected) | `server.js` (app.get basePath/health); uses dbHolder.getDb().get('SELECT 1'). |
| Config externalized | Port, host, DB path, CORS, rate limit, logging via env and config | `config/config.js`; env: PORT, HOST, DB_PATH, CORS_ORIGIN, RATE_LIMIT_*, LOG_LEVEL, etc. |

**Verification:** GET `/api/v1/health`; GET `/api/v1/crawler/status`; GET `/api/v1/crawler/config`.

### 2.3 Story 2.3 — Web UI (dashboard, book list, crawler monitoring)

| Epic 2 AC | books-admin-app web UI | Implementation location |
|-----------|-------------------------|--------------------------|
| Dashboard (high-level stats) | Dashboard section with stat cards (e.g. total books, by status) | `books-admin-app/public/index.html` — dashboard view, stats-grid, API calls to `/api/v1/stats/overview` and related. |
| Book list (filters, search, link to detail) | Books section: filters (author, category, etc.), search, pagination, click to book detail | Same file — books view, controls, books-list, pagination; GET `/api/v1/books`, `/api/v1/books/search`; detail modal or view. |
| Crawler status and logs view | Crawler section: status, start/stop, config, logs | Same file — crawler view; GET `/api/v1/crawler/status`, `/logs`; POST start/stop; config get/update. |
| Desktop responsive | Layout with sidebar, main content | Same file — app-shell, sidebar, main; responsive styles. |

**Verification:** Open app in browser; use Dashboard, Books (list, filters, search, detail), Crawler (status, start/stop, logs).

### 2.4 DB versioning (Story 6.2) and data view/edit (Story 6.4)

These extend the original database-viewer and are part of “database-viewer parity” for the merged app:

| Feature | books-admin-app | Implementation location |
|---------|-----------------|--------------------------|
| List DBs (active + backups), set active, delete backup | GET `/api/v1/databases`, PUT `/api/v1/databases/active`, DELETE `/api/v1/databases/:id` | `routes/databases.js`; `models/db-registry.js`. |
| Data view | Same books/stats UI; all read from active DB | Same as 2.3; dbHolder switches DB on set active. |
| Data edit | PATCH `/api/v1/books/:id`; edit form in UI; last_edited_at | `routes/books.js` (PATCH `/:id`); `models/database.js` (`updateBook`); `public/index.html` (edit form, save). |

**Verification:** GET `/api/v1/databases`; switch active DB via API or UI; PATCH a book; confirm last_edited_at in response.

---

## 3. Summary table (AC → feature)

| Epic | Story | Summary of behavior | books-admin-app |
|------|-------|----------------------|-----------------|
| 1 | 1.1 | Metadata, audio URLs, schema | Crawler subprocess (grqaser-crawler) + active DB + config; API/UI read from active DB |
| 1 | 1.2 | Full catalog, pagination, progress/logs | Crawler subprocess; GET /books (pagination), /crawler/status, /crawler/logs |
| 1 | 1.3 | Search, categories, authors, relationships | Crawler subprocess; GET /books (filters), /books/search, /stats/authors, /stats/categories |
| 1 | 1.4 | Cleaning, validation, schema, SQLite path | Crawler subprocess; active DB from db-registry; same schema |
| 2 | 2.1 | Books API, stats API | routes/books.js, routes/stats.js, models/database.js |
| 2 | 2.2 | Crawler status API, health, config | routes/crawler.js, server.js (health), config.js |
| 2 | 2.3 | Web UI (dashboard, books, crawler) | public/index.html |
| 6 | 6.2 | DB versioning | routes/databases.js, models/db-registry.js |
| 6 | 6.4 | Data view and edit | PATCH /books/:id, database.updateBook, public UI edit form |

---

## 4. Optional verification checklist

Use this for manual or scripted verification (optional per Story 7.1).

- [ ] **Crawler:** POST `/api/v1/crawler/start` with default config; GET `/api/v1/crawler/status` shows is_running then last_run when finished; GET `/api/v1/crawler/logs` returns entries.
- [ ] **Books:** GET `/api/v1/books`, GET `/api/v1/books/:id`, GET `/api/v1/books/search?q=...` return success and data from active DB.
- [ ] **Stats:** GET `/api/v1/stats/overview`, `/api/v1/stats/authors`, `/api/v1/stats/categories` return success and data.
- [ ] **Health:** GET `/api/v1/health` returns 200 and data.database `connected` when DB is up.
- [ ] **Config:** GET `/api/v1/crawler/config` returns dbPath (active), mode, etc.; PUT updates stored config.
- [ ] **Databases:** GET `/api/v1/databases` lists DBs; PUT `/api/v1/databases/active` with body `{ path }` or `{ id }` switches active DB.
- [ ] **Edit:** PATCH `/api/v1/books/:id` with body updates book and returns last_edited_at.
- [ ] **Web UI:** Dashboard, Books (list, filters, search, detail), Crawler (status, start/stop, logs), Databases (list, set active) and book edit form work in browser.

---

## 5. Sign-off

| Role | Name | Date | Approval |
|------|------|------|-----------|
| QA (Test Architect) | Quinn | 2025-02-17 | Parity document and architecture refs verified; gate PASS. |
| Dev Agent | — | 2025-02-17 | Parity mapping and implementation locations verified. |
| Product Owner / Developer | _[Optional: add name and date]_ | _[Date]_ | Parity is sufficient for **Epic 5** verification and **Story 7.2** (removal of standalone crawler and database-viewer). books-admin-app is the **single admin entrypoint**. |

**Reference from Epic 7 / delivery order:** Runbooks and Epic 5 verification should refer to **books-admin-app** only (see [Delivery order and application boundaries](architecture/delivery-order-and-application-boundaries.md)). This parity document is the mapping of Epic 1/2 ACs to books-admin-app features and implementation locations.
