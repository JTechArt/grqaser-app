# Epic 5: Quality, release, and operations

Can be planned per application. **Admin side:** books-admin-app (merge of crawler and database-viewer) is the single admin application to test and run. **Consumer side:** GrqaserApp. Phase order: verify books-admin-app (crawler + viewer behavior) first, then GrqaserApp.

**Goal:** Reliable testing, build, and deployment for **books-admin-app** and GrqaserApp so the system can be run and released with confidence. Books-admin-app replaces the former standalone crawler and database-viewer (see Epic 7 for removal of legacy apps).

---

## Story 5.1 — Books-admin-app testing (crawler + viewer behavior)

**As a** developer,  
**I want** automated tests for books-admin-app covering crawler behavior (parsing, validation, DB writes) and viewer behavior (API, optional UI),  
**so that** regressions are caught before release and we have one test surface for the admin application.

### Acceptance Criteria

1. Books-admin-app’s crawler capability has unit tests for parsing/normalization and integration tests for DB writes (or equivalent coverage via books-admin-app test suite).
2. Books-admin-app has tests for main API routes (books, stats, crawler, health) and health check.
3. Tests run in a single command (e.g., npm script or CI job) for books-admin-app.

---

## Story 5.2 — GrqaserApp testing and build

**As a** developer,  
**I want** component/unit and integration tests for GrqaserApp and working iOS/Android builds,  
**so that** we can ship to TestFlight/Internal testing.

### Acceptance Criteria

1. Key components and flows have unit/integration tests; critical path (e.g., play a book) has E2E where feasible.
2. iOS and Android build and run from the repo; signing and env config are documented.
3. Lint and test run in CI where applicable.

---

## Story 5.3 — Deployment and runbooks

**As an** operator,  
**I want** clear steps to run books-admin-app and (where applicable) GrqaserApp distribution,  
**so that** the system can be deployed and updated safely.

### Acceptance Criteria

1. Books-admin-app run instructions are documented (port, DB path, env, how to start/stop crawler and use DB versioning per Epic 6).
2. Crawler run is documented as part of books-admin-app (start/stop and config via app per 6.3); no separate standalone crawler runbook.
3. GrqaserApp store submission (or internal distribution) steps and requirements are documented.
4. Known troubleshooting (e.g., from docs/tasks/06-TROUBLESHOOTING.md) is referenced or summarized.
