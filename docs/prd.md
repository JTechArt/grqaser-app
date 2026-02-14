# Grqaser Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Deliver a **data crawler** pipeline that reliably extracts and updates audiobook catalog and audio URLs from grqaser.org into the project’s canonical data store (SQLite).
- Deliver a **database-viewer** (admin panel) so operators can inspect crawled data, monitor crawler status, and validate content via a web UI and REST API.
- Deliver **GrqaserApp**, the main mobile application, so users can discover, search, and listen to audiobooks from the crawled catalog with a good listening experience (streaming, background playback, progress, search, and basic preferences).
- Ensure the three applications (crawler, database-viewer, GrqaserApp) share a clear data contract and that the crawler is the single source of truth for updating the main project data.
- **Treat the three applications separately and deliver them in strict order:** (1) Data crawler finalized and complete → (2) Database-viewer built and used to verify crawled data → (3) Mobile app built only after 1 and 2, relying on the crawler’s output.

### Background Context

Grqaser (“book lover” in Armenian) is an ecosystem of three applications around audiobooks from [grqaser.org](https://grqaser.org): (1) a **data crawler** that updates the main project’s data, (2) a **database-viewer** that acts as an admin panel to view and monitor that data, and (3) **GrqaserApp**, the consumer-facing mobile app that relies on the crawled data. The crawler is the pipeline that keeps the catalog and audio references up to date; the database-viewer supports operations and debugging; the mobile app delivers the primary user value (browse, search, listen). This PRD scopes the MVP for all three so they work together with a consistent data model and update flow.

### Change Log

| Date       | Version | Description                    | Author   |
|-----------|---------|--------------------------------|----------|
| 2025-02-14 | 1.0     | Initial PRD from docs/tasks    | PM (John) |
| 2025-02-14 | 1.1     | Explicit delivery order and guidance for other workers | PM (John) |

---

## Critical: Delivery order and application boundaries

**The three applications must be cared for separately and delivered in this order. Do not start the next phase until the current one is done and validated.**

| Phase | Application      | Rule |
|-------|------------------|------|
| **1** | **Data crawler** | Finalize first. Complete all crawler work (metadata, audio URLs, full catalog, cleaning, schema). Consider the crawler “done” only when data is complete, validated, and the schema is documented. |
| **2** | **Database-viewer** | Start only after Phase 1 is complete. Use the database-viewer to check that crawled data is correct and that the API and web UI work against the real database. Do not move to Phase 3 until the viewer has validated the crawler output. |
| **3** | **GrqaserApp (mobile)** | Start only after Phases 1 and 2 are complete. The mobile app relies on the result of the first application (crawler) and on the database-viewer (or data export) for its data. No mobile app development that depends on catalog/playback data should begin before the crawler is done and the viewer has confirmed data correctness. |

**Definition of “Phase complete”**

- **Phase 1 complete:** Crawler runs successfully, full catalog (or agreed target) is in the DB, schema is documented, and data quality is accepted (e.g., no missing required fields, audio URLs valid where expected).
- **Phase 2 complete:** Database-viewer is implemented and used to verify that crawled data is correct; books, stats, and crawler monitoring work; team agrees data is ready for the mobile app.
- **Phase 3 start:** Only after Phase 2 sign-off; GrqaserApp then consumes the crawler’s data (via database-viewer API or agreed export).

### Guidance for other workers (Architect, Dev, SM, PO, QA)

- **Architect:** Design and document each application separately. Enforce the dependency: crawler → database-viewer → GrqaserApp. Do not design mobile data integration or APIs that assume crawler or viewer work is still in progress; align milestones with the phase gates above.
- **Dev:** Implement in phase order. Do not start database-viewer stories until the crawler is finalized. Do not start GrqaserApp catalog/playback stories until the database-viewer has been used to validate crawler data. If you are assigned to a later phase, assume the previous phase is complete and use its outputs only.
- **Scrum Master / PO:** Plan and sequence work so that Epic 1 (crawler) is fully done before Epic 2 (database-viewer), and Epic 2 is done and data validated before Epic 3 (GrqaserApp). Do not schedule stories that break this order. Acceptance for “Epic 1 done” includes “crawler data complete and schema documented”; for “Epic 2 done” include “crawler data verified via database-viewer.”
- **QA:** Test each application in phase order. Validate crawler output and schema before signing off Phase 1. Use the database-viewer to verify data correctness before signing off Phase 2. Test the mobile app only against data that has passed Phase 2 validation.

---

## Requirements

### Functional

- **FR1:** The data crawler shall extract audiobook metadata (title, author, description, duration, categories, ratings, language) from grqaser.org and persist it to the project’s SQLite database.
- **FR2:** The data crawler shall extract and validate audio file URLs for each book and store them in the database.
- **FR3:** The data crawler shall support pagination and full catalog coverage (target 950+ books) with configurable rate limiting and retries.
- **FR4:** The data crawler shall support search-based discovery on the source site and merge search results into the catalog without duplicates.
- **FR5:** The data crawler shall produce clean, normalized data (no HTML in text fields, consistent encoding, unique IDs) suitable for the database-viewer and GrqaserApp.
- **FR6:** The database-viewer shall expose a REST API for books (list, by id, search), stats (overview, authors, categories), crawler status (status, URL queue, logs), and health.
- **FR7:** The database-viewer shall provide a web UI to browse books, filter/search, and monitor crawler status and logs.
- **FR8:** GrqaserApp shall allow users to browse the audiobook catalog (e.g., featured, categories) and view book details.
- **FR9:** GrqaserApp shall provide search and filtering over the catalog.
- **FR10:** GrqaserApp shall play audiobooks (streaming) with play/pause, seek, progress, and duration display.
- **FR11:** GrqaserApp shall support background audio playback and basic lock-screen/notification controls.
- **FR12:** GrqaserApp shall support user preferences such as favorites and playback position persistence.
- **FR13:** GrqaserApp shall support dark and light theme.

### Non Functional

- **NFR1:** Crawler runs shall use timeouts and retries (e.g., 30s timeout, 3 retries) and log errors for diagnosability.
- **NFR2:** Database-viewer shall be configurable (port, DB path, CORS, rate limit, logging) and optionally log to file.
- **NFR3:** GrqaserApp shall target iOS and Android with a single codebase (React Native).
- **NFR4:** GrqaserApp shall handle network failures and playback errors with clear user feedback.
- **NFR5:** Data flow from crawler → database → database-viewer and GrqaserApp shall use a single, documented schema/contract.
- **NFR6:** Delivery order is mandatory: (1) Data crawler finalized and complete, (2) Database-viewer implemented and used to verify crawled data, (3) GrqaserApp developed relying on the crawler’s output. No phase may be started before the previous one is complete and validated as defined in this PRD.

---

## User Interface Design Goals

### Overall UX Vision

- **Crawler:** Headless pipeline; UX is CLI/log output and (optionally) status visible in the database-viewer.
- **Database-viewer:** Admin-focused: quick overview of data quality, book list with filters/search, and crawler monitoring. Dense but clear.
- **GrqaserApp:** User-focused: simple browse → book detail → listen flow; minimal friction to start listening; clear progress and controls.

### Key Interaction Paradigms

- **Database-viewer:** List/detail and dashboard patterns; filters and search; read-only admin operations.
- **GrqaserApp:** Tab or stack navigation (e.g., Home, Search, Library/Profile); tap to open book detail; persistent mini-player or full-screen player with standard audio controls.

### Core Screens and Views

- **Database-viewer:** Dashboard (stats/overview), Book list (with filters/search), Book detail (if applicable), Crawler status/logs view.
- **GrqaserApp:** Home (featured/categories), Search, Book detail, Audio player (full-screen and/or mini), Profile/Settings (preferences, theme).

### Accessibility

- **Database-viewer:** None specified for MVP; follow basic semantics.
- **GrqaserApp:** Aim for WCAG AA where applicable (labels, contrast, touch targets).

### Branding

- Grqaser identity (name, “book lover”) to be reflected in GrqaserApp; database-viewer can remain neutral/admin-style.

### Target Device and Platforms

- **Crawler:** Node.js (CLI/server environment).
- **Database-viewer:** Web responsive (desktop-first admin).
- **GrqaserApp:** Mobile only (iOS and Android via React Native).

---

## Technical Assumptions

### Repository Structure: Monorepo

- Single repository containing `crawler/`, `database-viewer/`, and `GrqaserApp/` (or equivalent app directory). Shared data contract (e.g., schema, types) can live in a shared folder or be documented in one place.

### Service Architecture

- **Crawler:** Node.js (e.g., Puppeteer) script or service; writes to SQLite (`grqaser.db` or configured path).
- **Database-viewer:** Express (or similar) server; reads from same SQLite DB; serves REST API and static web UI.
- **GrqaserApp:** React Native app; consumes data via API from database-viewer (or from an export/sync layer) for production; may use bundled/exported data for offline or development.

### Testing Requirements

- **Crawler:** Unit tests for parsing/normalization; integration tests for DB writes; optional smoke test against a test page.
- **Database-viewer:** Unit tests for API handlers; integration tests for API + DB.
- **GrqaserApp:** Unit + integration (e.g., components, Redux); E2E for critical flows (e.g., play a book) where feasible.

### Additional Technical Assumptions and Requests

- SQLite is the canonical store produced by the crawler and read by the database-viewer; schema must be versioned and documented.
- Crawler and database-viewer may run on the same machine or different; DB path and CORS must be configurable.
- GrqaserApp will use a state management solution (e.g., Redux Toolkit) and a navigation library (e.g., React Navigation).
- Audio playback in GrqaserApp will use a library such as react-native-track-player; background and lock-screen behavior must be configured per platform.

---

## Epic List

**Mandatory order:** Complete each epic (and validate where stated) before starting the next. Epics 2–5 depend on previous epics as noted.

1. **Epic 1: Crawler pipeline and data contract** — Harden the data crawler, complete extraction (metadata + audio URLs, categories, authors), normalize and validate data, and define the shared schema. **Must be fully done before any Epic 2 work.** This is Phase 1 (data crawler).
2. **Epic 2: Database-viewer (admin panel)** — Ensure the database-viewer’s API and web UI support browsing books, stats, and crawler monitoring. **Start only after Epic 1 is complete.** Use the viewer to verify that crawled data is correct; do not start Epic 3 until this validation is done. This is Phase 2 (database-viewer).
3. **Epic 3: GrqaserApp foundation** — Set up the React Native app and implement browse and book-detail flows. **Start only after Epic 2 is complete and crawler data has been validated via the database-viewer.** GrqaserApp relies on the result of the crawler (Phase 1). This is Phase 3 (mobile app).
4. **Epic 4: GrqaserApp audio and playback** — Integrate audio playback and user preferences. Depends on Epic 3.
5. **Epic 5: Quality, release, and operations** — Testing, build, and deployment for all three applications. Can be planned per application but follows the same phase order (crawler first, then viewer, then app).

---

## Epic 1: Crawler pipeline and data contract

**Goal:** The crawler is the single pipeline that updates the main project’s data. This epic delivers a reliable, complete crawl (metadata + audio URLs, categories, authors), normalized and validated output, and a documented data contract (schema) for the database-viewer and GrqaserApp.

### Story 1.1 — Complete and normalize book metadata and audio URLs

As an operator,  
I want the crawler to extract full book metadata and valid audio URLs for each book,  
so that the database-viewer and GrqaserApp have complete, playable catalog data.

**Acceptance Criteria**

1. Duration is parsed into a structured format (e.g., hours, minutes, formatted string).
2. Audio URLs are extracted from book detail pages, validated, and stored.
3. Categories/genres, ratings, descriptions, and language are extracted and stored per book.
4. Output schema is documented and consistent (e.g., unique IDs, required fields).

---

### Story 1.2 — Full catalog and pagination

As an operator,  
I want the crawler to traverse all listing pages and book detail pages (pagination),  
so that the full catalog (target 950+ books) is present in the database.

**Acceptance Criteria**

1. Listing and detail pagination are implemented with configurable rate limiting.
2. All target books are crawled; duplicates are detected and avoided.
3. Each book has a complete metadata set and audio URLs where available.
4. Crawler run progress and errors are loggable and (optionally) visible via database-viewer.

---

### Story 1.3 — Search and categories/authors

As an operator,  
I want the crawler to use site search and category/author structures where available,  
so that catalog and relationships (book–author, book–category) are complete and consistent.

**Acceptance Criteria**

1. Search flow on the source site works; results are merged into the catalog without duplicates.
2. Categories and authors are extracted and linked to books.
3. Data relationships support filtering and stats in the database-viewer and GrqaserApp.

---

### Story 1.4 — Data cleaning, validation, and schema

As a developer,  
I want crawled data to be cleaned, validated, and written against a fixed schema,  
so that the database-viewer and GrqaserApp can consume it without ad-hoc fixes.

**Acceptance Criteria**

1. Text fields are cleaned (no HTML, normalized encoding).
2. Required fields and types are validated before write; invalid rows are logged/skipped.
3. Schema (tables, columns, constraints) is documented and versioned.
4. Data is written to the project’s SQLite database in the agreed location/path.

---

## Epic 2: Database-viewer (admin panel)

**Phase 2 — start only after Epic 1 (crawler) is complete.** Use this application to verify that crawled data is correct before starting GrqaserApp (Epic 3).

**Goal:** The database-viewer is the admin panel to view and monitor crawled data. This epic ensures the REST API and web UI fully support books, stats, and crawler status using the crawler’s schema.

### Story 2.1 — Books API and stats API

As an operator,  
I want a REST API for books (list, by id, search) and stats (overview, authors, categories),  
so that I can integrate and debug catalog data programmatically.

**Acceptance Criteria**

1. `GET /api/v1/books` returns a list with pagination/filters as needed.
2. `GET /api/v1/books/:id` returns a single book by id.
3. `GET /api/v1/books/search?q=...` returns search results.
4. Stats endpoints (e.g., overview, authors, categories) return counts/aggregates consistent with the schema.

---

### Story 2.2 — Crawler status API and health

As an operator,  
I want endpoints for crawler status, URL queue, and logs, plus a health check,  
so that I can monitor the pipeline from the admin panel or scripts.

**Acceptance Criteria**

1. Crawler status (and optionally URL queue and logs) are exposed via API (e.g., `/api/v1/crawler/status`, `/urls`, `/logs`).
2. `GET /api/v1/health` returns service health and optionally DB connectivity.
3. Configuration (port, DB path, CORS, rate limit, logging) is externalized (e.g., env or config file).

---

### Story 2.3 — Web UI for books and crawler monitoring

As an operator,  
I want a web UI to browse books (list, filters, search), view stats, and see crawler status/logs,  
so that I can inspect data and pipeline health without using the API directly.

**Acceptance Criteria**

1. Dashboard shows high-level stats (e.g., book count, recent activity).
2. Book list supports filters and search and links to book detail where applicable.
3. A dedicated view shows crawler status and logs (or links to logs).
4. UI is usable on desktop (responsive admin experience).

---

## Epic 3: GrqaserApp foundation

**Phase 3 — start only after Epic 2 (database-viewer) is complete and crawler data has been validated.** GrqaserApp relies on the result of the first application (data crawler).

**Goal:** GrqaserApp is the main mobile app. This epic establishes the React Native project, navigation, state management, and data integration so users can browse the catalog and open book details using the crawler’s data.

### Story 3.1 — Project setup and structure

As a developer,  
I want the React Native project initialized with a clear structure (screens, navigation, state, services),  
so that feature work can proceed in a consistent way.

**Acceptance Criteria**

1. React Native app runs on iOS and Android (emulator/simulator).
2. Folder structure includes screens, navigation, state, services, types, and shared constants.
3. TypeScript, ESLint, and Prettier are configured; path aliases work.

---

### Story 3.2 — Navigation and core screens

As a user,  
I want to move between Home, Search, Book detail, and Profile/Settings,  
so that I can discover books and manage preferences.

**Acceptance Criteria**

1. Tab (or equivalent) navigation for main sections; stack for detail flows.
2. Placeholder or minimal implementations for Home, Search, Book detail, Profile/Settings.
3. Navigation types are defined and deep linking is considered for future use.

---

### Story 3.3 — State management and data integration

As a developer,  
I want state (books, search, user preferences) and data services to be wired to the crawler-backed API or data export,  
so that the UI shows real catalog data.

**Acceptance Criteria**

1. State management (e.g., Redux Toolkit) is configured with slices for books, audio, user, search.
2. Data services load books (list, by id, search) from the database-viewer API or agreed data source.
3. Loading and error states are handled; data is displayed on Home and Search.

---

### Story 3.4 — Home and book detail UI

As a user,  
I want to see featured/categorized books on Home and full book information on a detail screen,  
so that I can choose what to listen to.

**Acceptance Criteria**

1. Home shows catalog content (e.g., featured list and/or categories) from the integrated data.
2. Book detail shows metadata (title, author, description, duration, etc.) and is ready for “Play” integration.
3. Pull-to-refresh updates the list where applicable.

---

## Epic 4: GrqaserApp audio and playback

**Goal:** Users can stream audiobooks with a reliable player, background playback, and persisted progress; basic preferences (favorites, theme) improve experience.

### Story 4.1 — Core audio player

As a user,  
I want to play, pause, seek, and see progress and duration,  
so that I can listen to audiobooks with standard controls.

**Acceptance Criteria**

1. Playback uses the audio URLs from the crawler-backed data.
2. Play/pause, seek, and progress/duration display work correctly.
3. Player UI (full-screen or mini) is clear and responsive.

---

### Story 4.2 — Background playback and controls

As a user,  
I want playback to continue in the background with lock-screen/notification controls,  
so that I can use other apps or lock the device while listening.

**Acceptance Criteria**

1. Audio continues when the app is in the background; interruptions (e.g., calls) are handled.
2. Lock-screen (iOS) and notification (Android) controls work for play/pause and optionally seek.
3. Playback resumes appropriately after interruptions.

---

### Story 4.3 — Progress and preferences

As a user,  
I want my playback position and preferences (favorites, theme) to persist,  
so that I can resume and use the app my way across sessions.

**Acceptance Criteria**

1. Playback position is saved and restored per book/session.
2. Favorites (or equivalent) can be toggled and persist.
3. Dark/light theme preference is supported and persisted.

---

## Epic 5: Quality, release, and operations

**Goal:** Reliable testing, build, and deployment for the crawler, database-viewer, and GrqaserApp so the system can be run and released with confidence.

### Story 5.1 — Crawler and database-viewer testing

As a developer,  
I want automated tests for the crawler (parsing, validation, DB writes) and database-viewer (API, optional UI),  
so that regressions are caught before release.

**Acceptance Criteria**

1. Crawler has unit tests for parsing/normalization and integration tests for DB writes.
2. Database-viewer has tests for main API routes and health.
3. Tests run in a single command (e.g., npm script or CI job).

---

### Story 5.2 — GrqaserApp testing and build

As a developer,  
I want component/unit and integration tests for GrqaserApp and working iOS/Android builds,  
so that we can ship to TestFlight/Internal testing.

**Acceptance Criteria**

1. Key components and flows have unit/integration tests; critical path (e.g., play a book) has E2E where feasible.
2. iOS and Android build and run from the repo; signing and env config are documented.
3. Lint and test run in CI where applicable.

---

### Story 5.3 — Deployment and runbooks

As an operator,  
I want clear steps to run the crawler, database-viewer, and (where applicable) GrqaserApp distribution,  
so that the system can be deployed and updated safely.

**Acceptance Criteria**

1. Crawler run instructions (env, DB path, schedule if any) are documented.
2. Database-viewer run instructions (port, DB path, CORS) are documented.
3. GrqaserApp store submission (or internal distribution) steps and requirements are documented.
4. Known troubleshooting (e.g., from docs/tasks/06-TROUBLESHOOTING.md) is referenced or summarized.

---

## Checklist Results Report

_To be populated after running the pm-checklist. Offer to output the full PRD and then execute the checklist and fill this section._

---

## Next Steps

### UX Expert Prompt

Use this PRD as the product input. Produce a front-end spec (and/or UI/UX guidance) for (1) the database-viewer web UI and (2) GrqaserApp mobile screens and flows, aligned to the Core Screens and Views and Target Platforms above. Focus on admin UX for the viewer and user-focused listen/browse UX for the app.

### Architect Prompt

Use this PRD and the existing repos (crawler, database-viewer, GrqaserApp) as input. Produce (or update) the architecture document covering: (1) crawler pipeline and SQLite schema/data contract, (2) database-viewer API and deployment, (3) GrqaserApp data integration and audio stack, (4) testing and deployment strategy for all three applications. Ensure the three-app boundary and data flow are explicit.
