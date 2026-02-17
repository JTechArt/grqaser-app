# Database-viewer API and deployment

**Superseded by books-admin-app (Epic 6–7).** The standalone **database-viewer** is **removed or archived** (Epic 7.2). This document describes the API and behavior that **books-admin-app** preserves and implements. Use books-admin-app for all admin API and web UI; see [Books-admin-app architecture](./books-admin-app-architecture.md) and [delivery order](./delivery-order-and-application-boundaries.md).

## Role and boundaries

- **Responsibility:** Read-only admin panel. Expose REST API for books, stats, crawler status/logs, and health; provide web UI to browse books, filter/search, and monitor crawler. Validate crawler output before Phase 3.
- **Does not:** Write to the canonical SQLite DB. Does not implement mobile app features.
- **Input:** Same SQLite database produced by the crawler (path configurable). Phase 2 starts only after Phase 1 is complete and data is acceptable.

## API

- **Base:** `/api/v1`. **Books:** `GET /api/v1/books` (list, pagination/filters), `GET /api/v1/books/:id`, `GET /api/v1/books/search?q=...`. **Stats:** Overview, authors, categories (counts/aggregates consistent with schema). **Crawler:** Status, URL queue, logs (e.g. `/api/v1/crawler/status`, `/urls`, `/logs`). **Health:** `GET /api/v1/health` (service and DB connectivity).
- **Config:** Port, DB path, CORS, rate limit, logging externalized (env or config file). Optional file logging (e.g. `logs/`).

## Web UI

- **Location:** Static assets in `database-viewer/public/` (e.g. `index.html`). Served by Express.
- **Features:** Dashboard (stats/overview), book list (filters, search, link to detail where applicable), crawler status and logs view. Desktop-first responsive admin experience.

## Deployment and run

- **Run:** e.g. `npm run dev` (nodemon) or `npm start`. Default port (e.g. 3001) and DB path configurable. Same machine or different from crawler; CORS and DB path must be set for environment.
- **Phase 2 complete when:** Database-viewer is implemented and used to verify crawled data; books, stats, and crawler monitoring work; team agrees data is ready for the mobile app.

## Project structure (database-viewer)

- **Entry:** `database-viewer/src/server.js`. **Config:** `database-viewer/src/config/config.js`. **Routes:** `books.js`, `stats.js`, `crawler.js`. **Models:** `database.js` (SQLite read). **UI:** `database-viewer/public/index.html`.

## References

- Epic 2 (Database-viewer); Stories 2.1–2.3. PRD FR6, FR7, NFR2.
- [Data models and schema](./data-models-and-schema.md) — Schema consumed by API.
- [Tech stack](./tech-stack.md) — Database-viewer row.
- [Testing and deployment strategy](./testing-and-deployment-strategy.md) — Viewer tests and runbooks.
