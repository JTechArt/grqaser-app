# Books-admin-app architecture (Epic 6–7)

**Brownfield enhancement.** **books-admin-app** is the **single local admin application** (Epic 6). After **Epic 7**, the standalone crawler and database-viewer are **removed or archived** (Story 7.2); books-admin-app is the only admin entrypoint. This document defines the merged app: run model, database versioning, crawler control, config management, data view + edit, and **design system and UI/UX** (Epic 7). See [Epic 6](../prd/epic-6.md) and [Epic 7](../prd/epic-7.md). **No authentication; local-only use (not deployed).**

## Role and boundaries

- **Responsibility:** One local admin application that (1) runs the crawler, (2) manages crawler config and DB versioning, (3) provides a data management UI to view and edit crawled data. Replaces the current separate crawler and database-viewer with a single entrypoint.
- **Does not:** Add authentication or deployment to a shared environment. GrqaserApp and external consumers continue to use the same data contract (schema) and can point at the books-admin-app API if they currently use the database-viewer API.
- **Inputs:** Same tech stack as crawler (Node.js, Puppeteer, SQLite) and database-viewer (Express, REST, web UI), reused within the merged app.

## Single application run model (Story 6.1)

- **One process** starts both crawler capability and viewer/API capability. Options (choose one for implementation):
  - **Shared server:** Express server hosts REST API and web UI; crawler runs as an in-process library or worker (same Node process).
  - **Crawler as subprocess:** Main process runs Express; crawler is spawned as a child process and controlled via IPC or API (start/stop, config passed or read from shared config).
- **Preserved behavior:** Existing crawler behavior (crawl modes, write to SQLite) and database-viewer behavior (REST API for books/stats/crawler/health, web UI for browse and monitoring) remain accessible from the single app. No regression in data contract or schema for GrqaserApp.
- **Configuration:** Port, logging, and other runtime settings are externalized (env or config file). DB path is governed by [Database versioning](#database-versioning-story-62) (Story 6.2).

## Database versioning (Story 6.2)

- **Concept:** Database paths are versioned (e.g. `db.v1`, `db.v2`). **One database is active at a time;** all other known DBs are backups.
- **Active DB:** All crawler writes go to the active DB path. The data view and API read from the active DB path. When the active path is changed, subsequent crawler runs write to the new active path and the data view shows the new active DB.
- **Operations (UI or API):** List known DBs (active + backups), set active (promote a backup to active), physically delete a backup. No automatic promotion; user explicitly sets which `db.{version}` is active.
- **Persistence of “active”:** The app must persist which path is active (e.g. config file, small metadata file, or env) so that on restart the same active DB is used.
- **Path naming:** Support `db.{version}` or equivalent path naming; exact convention (e.g. directory `data/db.v1/grqaser.db` vs file `data/grqaser.db.v1`) is an implementation choice consistent with “one active, rest backups.”

## Crawler start/stop and config management (Story 6.3)

- **Start/stop:** User can start and stop the crawler from the app (web UI and/or API). When running as in-process library, “stop” means abort or pause the current run; when running as subprocess, stop terminates the subprocess.
- **Config management:** Crawler configuration (mode, DB path, rate limits, timeouts, etc.) is manageable within the app (view and edit). Changes apply to **subsequent** crawler runs. Crawler config includes or references the **active DB path** (aligned with Story 6.2).
- **Visibility:** Crawler status and logs remain visible in the app (building on existing database-viewer crawler monitoring endpoints and UI).

## Data management: view and edit (Story 6.4)

- **View:** Data view uses the **active database** to display books and related entities (e.g. authors, categories) with list, detail, search, and filters as today. Read-only API behavior for books/stats remains; additional endpoints or same endpoints with new methods for updates as needed.
- **Edit:** User can edit any field for a given object (e.g. book title, author, description, audio URL) and persist changes to the active DB. Edits are applied **in place** (SQL UPDATE); the UI reflects the updated data; no duplicate records created by the edit flow.
- **Audit:** Manual edits are distinguishable from crawler-written data where feasible (e.g. optional `last_edited_at` timestamp or source indicator). Safe for local-only use; no auth required.

## API surface (aligned with existing + new)

- **Existing (preserved):** `GET /api/v1/books`, `GET /api/v1/books/:id`, `GET /api/v1/books/search`, stats, crawler status/URLs/logs, `GET /api/v1/health`. All read from active DB.
- **New or extended:**
  - **DB versioning:** List DBs, set active, delete backup (e.g. `GET /api/v1/databases`, `PUT /api/v1/databases/active`, `DELETE /api/v1/databases/:id` or equivalent).
  - **Crawler control:** Start/stop (e.g. `POST /api/v1/crawler/start`, `POST /api/v1/crawler/stop`), get/update crawler config (e.g. `GET /api/v1/crawler/config`, `PUT /api/v1/crawler/config`).
  - **Data edit:** Update a book (e.g. `PATCH /api/v1/books/:id` or `PUT /api/v1/books/:id`) with body containing editable fields; persist to active DB and return updated resource.

## Project structure (books-admin-app)

- **Root:** `books-admin-app/` at repo root (sibling to `crawler/`, `database-viewer/`, `GrqaserApp/`).
- **Suggested layout:**
  - `books-admin-app/src/server.js` — Express entry; mounts API routes and serves static UI.
  - `books-admin-app/src/config/` — App config (port, logging); includes active DB path and crawler config (or references to same).
  - `books-admin-app/src/routes/` — books, stats, crawler (status/logs/start/stop/config), databases (list/set-active/delete), health.
  - `books-admin-app/src/models/` or `books-admin-app/src/db/` — SQLite access (read + write for active DB); DB versioning metadata.
  - **Crawler:** Either (a) `books-admin-app/src/crawler/` — in-process crawler (logic moved from `crawler/`), or (b) crawler invoked as subprocess pointing at `crawler/src/crawler.js` with config/DB path passed.
  - `books-admin-app/public/` — Web UI (dashboard, book list/detail, crawler control and logs, DB versioning UI, data edit forms).
- **Schema and data contract:** Same as [Data models and schema](./data-models-and-schema.md). Books table may add optional `last_edited_at` (and optionally `edited_by`) for edit audit; see data-models doc.

## Tech stack (books-admin-app)

- Reuse existing crawler stack: Node.js, Puppeteer, SQLite. Reuse database-viewer stack: Express, REST, vanilla JS/HTML/CSS (or same UI approach) in `public/`. Config: env + JS (port, logging, active DB path, crawler config). No new runtime or framework required.

## Design system and UI/UX (Epic 7)

- **Design system:** Documented in `docs/design/README.md`: colors (slate + teal), typography (Plus Jakarta Sans), radii, usage for web vs mobile. Shared by books-admin-app and GrqaserApp.
- **Mockups:** Static HTML under `docs/design/`: `docs/design/index.html` is the design hub; `docs/design/books-admin-app/` contains mockups for Dashboard, Books, Crawler, Databases, Book detail/edit (Story 7.3).
- **Implementation (Story 7.4):** books-admin-app web UI (layout, navigation, colors, typography, components) matches or aligns with these mockups and the design system. Sidebar (or equivalent), sections Dashboard/Books/Crawler/Databases; buttons, forms, cards follow the design system. No regression in behavior; accessibility improvements where low-effort are optional.

## Risk mitigation (from Epic 6)

- **Primary risk:** Breaking existing crawler or viewer behavior during merge. **Mitigation:** Merge incrementally; keep crawler and viewer modules identifiable; preserve existing tests and add integration tests for the single app.
- **Rollback (pre–Epic 7.2):** Crawler and database-viewer code may be in history or archive; books-admin-app can be retired and the two apps restored if needed. After Epic 7.2, standalone apps are removed or archived per team policy.

## References

- [Epic 6](../prd/epic-6.md) — Books Admin App (merge crawler + database-viewer, data management).
- [Epic 7](../prd/epic-7.md) — Remove crawler and database-viewer; design system and UI/UX for books-admin-app and GrqaserApp.
- [Delivery order and application boundaries](./delivery-order-and-application-boundaries.md) — books-admin-app is the single admin app (post–Epic 7).
- [Crawler pipeline and data contract](./crawler-pipeline-and-data-contract.md) — Crawler behavior preserved in books-admin-app.
- [Database-viewer API and deployment](./database-viewer-api-and-deployment.md) — Viewer/API behavior preserved in books-admin-app.
- [Data models and schema](./data-models-and-schema.md) — Shared schema and optional edit-audit fields.
- `docs/design/` — Design system (README.md) and mockups (books-admin-app/, grqaser-app/).
