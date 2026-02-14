# Epic 5: Quality, release, and operations

Can be planned per application but follows the same phase order (crawler first, then viewer, then app).

**Goal:** Reliable testing, build, and deployment for the crawler, database-viewer, and GrqaserApp so the system can be run and released with confidence.

---

## Story 5.1 — Crawler and database-viewer testing

**As a** developer,  
**I want** automated tests for the crawler (parsing, validation, DB writes) and database-viewer (API, optional UI),  
**so that** regressions are caught before release.

### Acceptance Criteria

1. Crawler has unit tests for parsing/normalization and integration tests for DB writes.
2. Database-viewer has tests for main API routes and health.
3. Tests run in a single command (e.g., npm script or CI job).

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
**I want** clear steps to run the crawler, database-viewer, and (where applicable) GrqaserApp distribution,  
**so that** the system can be deployed and updated safely.

### Acceptance Criteria

1. Crawler run instructions (env, DB path, schedule if any) are documented.
2. Database-viewer run instructions (port, DB path, CORS) are documented.
3. GrqaserApp store submission (or internal distribution) steps and requirements are documented.
4. Known troubleshooting (e.g., from docs/tasks/06-TROUBLESHOOTING.md) is referenced or summarized.
