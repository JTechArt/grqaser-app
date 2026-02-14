# Epic 2: Database-viewer (admin panel)

**Phase 2 — start only after Epic 1 (crawler) is complete.** Use this application to verify that crawled data is correct before starting GrqaserApp (Epic 3).

**Goal:** The database-viewer is the admin panel to view and monitor crawled data. This epic ensures the REST API and web UI fully support books, stats, and crawler status using the crawler’s schema.

---

## Story 2.1 — Books API and stats API

**As an** operator,  
**I want** a REST API for books (list, by id, search) and stats (overview, authors, categories),  
**so that** I can integrate and debug catalog data programmatically.

### Acceptance Criteria

1. `GET /api/v1/books` returns a list with pagination/filters as needed.
2. `GET /api/v1/books/:id` returns a single book by id.
3. `GET /api/v1/books/search?q=...` returns search results.
4. Stats endpoints (e.g., overview, authors, categories) return counts/aggregates consistent with the schema.

---

## Story 2.2 — Crawler status API and health

**As an** operator,  
**I want** endpoints for crawler status, URL queue, and logs, plus a health check,  
**so that** I can monitor the pipeline from the admin panel or scripts.

### Acceptance Criteria

1. Crawler status (and optionally URL queue and logs) are exposed via API (e.g., `/api/v1/crawler/status`, `/urls`, `/logs`).
2. `GET /api/v1/health` returns service health and optionally DB connectivity.
3. Configuration (port, DB path, CORS, rate limit, logging) is externalized (e.g., env or config file).

---

## Story 2.3 — Web UI for books and crawler monitoring

**As an** operator,  
**I want** a web UI to browse books (list, filters, search), view stats, and see crawler status/logs,  
**so that** I can inspect data and pipeline health without using the API directly.

### Acceptance Criteria

1. Dashboard shows high-level stats (e.g., book count, recent activity).
2. Book list supports filters and search and links to book detail where applicable.
3. A dedicated view shows crawler status and logs (or links to logs).
4. UI is usable on desktop (responsive admin experience).
