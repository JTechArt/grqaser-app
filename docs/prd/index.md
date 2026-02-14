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

1. **[Epic 1: Crawler pipeline and data contract](./epic-1.md)** — Harden the data crawler, complete extraction (metadata + audio URLs, categories, authors), normalize and validate data, and define the shared schema. **Must be fully done before any Epic 2 work.** This is Phase 1 (data crawler).
2. **[Epic 2: Database-viewer (admin panel)](./epic-2.md)** — Ensure the database-viewer’s API and web UI support browsing books, stats, and crawler monitoring. **Start only after Epic 1 is complete.** Use the viewer to verify that crawled data is correct; do not start Epic 3 until this validation is done. This is Phase 2 (database-viewer).
3. **[Epic 3: GrqaserApp foundation](./epic-3.md)** — Set up the React Native app and implement browse and book-detail flows. **Start only after Epic 2 is complete and crawler data has been validated via the database-viewer.** GrqaserApp relies on the result of the crawler (Phase 1). This is Phase 3 (mobile app).
4. **[Epic 4: GrqaserApp audio and playback](./epic-4.md)** — Integrate audio playback and user preferences. Depends on Epic 3.
5. **[Epic 5: Quality, release, and operations](./epic-5.md)** — Testing, build, and deployment for all three applications. Can be planned per application but follows the same phase order (crawler first, then viewer, then app).

---

## Checklist Results Report

_To be populated after running the pm-checklist._

---

## Next Steps

### UX Expert Prompt

Use this PRD as the product input. Produce a front-end spec (and/or UI/UX guidance) for (1) the database-viewer web UI and (2) GrqaserApp mobile screens and flows, aligned to the Core Screens and Views and Target Platforms above. Focus on admin UX for the viewer and user-focused listen/browse UX for the app.

### Architect Prompt

Use this PRD and the existing repos (crawler, database-viewer, GrqaserApp) as input. Produce (or update) the architecture document covering: (1) crawler pipeline and SQLite schema/data contract, (2) database-viewer API and deployment, (3) GrqaserApp data integration and audio stack, (4) testing and deployment strategy for all three applications. Ensure the three-app boundary and data flow are explicit.
