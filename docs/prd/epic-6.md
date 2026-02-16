# Epic 6: Books Admin App (merge crawler + database-viewer, data management)

**Brownfield enhancement.** Consolidate the existing **crawler** and **database-viewer** into a single application named **books-admin-app**, add crawler run control and config management, introduce database versioning (active/backup), and upgrade the data experience to full data management (view + manual field edits). **No authentication; local-only use (not deployed).**

**Goal:** One local admin application that runs the crawler, manages crawler config and DB versioning, and provides a data management UI to view and edit crawled data—replacing the current separate crawler and database-viewer with a single, cohesive books-admin-app.

---

## Story 6.1 — books-admin-app: merge and run

**As an** operator,  
**I want** the crawler and database-viewer merged into a single application (books-admin-app) that I can run locally,  
**so that** I have one entrypoint for all admin and data operations without running two separate apps.

### Acceptance Criteria

1. A new application **books-admin-app** exists; it contains the merged code and behavior of the current crawler and database-viewer.
2. One process starts both the crawler capability and the viewer/API capability (e.g., shared server, or crawler as subprocess/library).
3. Application runs locally only; no authentication is implemented or required.
4. Existing crawler behavior (crawl modes, write to SQLite) and database-viewer behavior (REST API for books/stats/crawler/health, web UI for browse and monitoring) are preserved and accessible from the single app.
5. Configuration (port, logging, etc.) is externalized; DB path is addressed in Story 6.2.

---

## Story 6.2 — Database versioning and active/backup

**As an** operator,  
**I want** to define database paths by version (e.g. db.v1, db.v2) with one active database and the rest as backups that I can promote or delete,  
**so that** crawler data goes to the active DB and the data view always shows the active DB, with clear backup management.

### Acceptance Criteria

1. The concept of **db.{version}** (or equivalent path naming) is supported; the user can set the active database path (e.g. which db.vX is active).
2. **Only one database is active at a time.** All other known DBs are treated as backups.
3. When the active DB path is changed, **new crawler runs write to the new active path**; the data view **reads from the active path** to show data.
4. User can **mark a backup as active** (switching which DB is active) and can **physically delete** a backup DB.
5. UI or API exposes: list of known DBs (active + backups), set active, delete backup; data view and crawler consistently use the active DB path.

---

## Story 6.3 — Crawler start/stop and config management

**As an** operator,  
**I want** to start and stop the data crawler from the books-admin-app and manage crawler configuration (including DB path/version) in the app,  
**so that** I can run and control the pipeline and adjust settings without editing config files by hand.

### Acceptance Criteria

1. User can **start** and **stop** the crawler from the app (web UI and/or API).
2. Crawler configuration (e.g. mode, DB path, rate limits, timeouts) is **manageable within the app** (view and edit); changes apply to subsequent crawler runs.
3. Crawler config includes or references the **active DB path** (aligned with Story 6.2) so that runs write to the correct db.{version}.
4. Crawler status and logs remain visible in the app (building on existing database-viewer crawler monitoring).

---

## Story 6.4 — Data management: view and edit

**As an** operator,  
**I want** to view data from the active database and manually adjust any field for a specific object (e.g. a book),  
**so that** I can correct or enrich data without re-crawling and keep the admin app as the data management surface.

### Acceptance Criteria

1. Data view uses the **active database** (Story 6.2) to display books and related entities (e.g. authors, categories) with list, detail, search, and filters as today.
2. User can **edit any field** for a given object (e.g. book title, author, description, audio URL) and **persist** changes to the active DB.
3. Edits are applied in place (UPDATE); the UI reflects the updated data; no duplicate records created by edit flow.
4. Manual edits are clearly distinguishable from crawler-written data where feasible (e.g. optional “last_edited_at” or source indicator), and safe for local-only use.

---

## Compatibility and scope

- **Existing systems:** Crawler and database-viewer are merged into books-admin-app; their current behavior is preserved where it fits the single-app model. GrqaserApp and any external consumers continue to rely on the same data contract (schema) and can point at the books-admin-app API if they currently use the database-viewer API.
- **No auth:** The application is intended for local use only and does not require authentication or deployment to a shared environment.
- **Tech stack:** Reuse existing crawler (Node.js, Puppeteer, SQLite) and database-viewer (Express, REST, web UI) stack within the merged app.

---

## Risk mitigation

- **Primary risk:** Breaking existing crawler or viewer behavior during merge. **Mitigation:** Merge incrementally; keep crawler and viewer modules identifiable; preserve existing tests and add integration tests for the single app.
- **Rollback:** Keep crawler and database-viewer code in history; books-admin-app can be retired and the two apps restored if needed.

---

## Definition of Done

- [ ] All stories 6.1–6.4 completed with acceptance criteria met.
- [ ] books-admin-app runs locally with merged crawler + viewer, DB versioning (active/backup), crawler control and config, and data view + edit.
- [ ] No regression in data contract or schema for GrqaserApp consumption.
- [ ] Documentation updated (how to run books-admin-app, config, DB versioning, and data management).
