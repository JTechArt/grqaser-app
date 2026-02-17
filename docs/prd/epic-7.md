# Epic 7: Remove crawler and database-viewer (consolidate on books-admin-app)

**Prerequisite:** Epic 6 (books-admin-app) is complete. books-admin-app is the merge of crawler and database-viewer; it provides the same functionality in a single application.

**Goal:** Once books-admin-app has been verified to match crawler and database-viewer functionality (per Epics 1 and 2), remove the standalone crawler and database-viewer applications from the repo. Update all references, runbooks, and quality/operations (Epic 5) to target books-admin-app. Optionally improve books-admin-app UI/UX for a cohesive admin experience.

---

## Story 7.1 — Verify books-admin-app functional parity

**As a** product owner / developer,  
**I want** to confirm that books-admin-app delivers the same capabilities as the original crawler and database-viewer (per Epic 1 and Epic 2),  
**so that** we can safely remove the legacy applications without losing functionality.

### Acceptance Criteria

1. **Crawler parity:** All Epic 1 behaviors are available via books-admin-app: metadata and audio URL extraction, full catalog and pagination, search/categories/authors, data cleaning and schema (crawler runs from app per 6.3; config and active DB per 6.2).
2. **Database-viewer parity:** All Epic 2 behaviors are available: books API (list, by id, search), stats API (overview, authors, categories), crawler status API and health, web UI for books/stats and crawler monitoring (plus 6.2 DB versioning and 6.4 view/edit).
3. Parity is documented (e.g. mapping Epic 1/2 ACs to books-admin-app features) and signed off so Epic 5 verification and Epic 7 removal can proceed.

---

## Story 7.2 — Remove crawler and database-viewer

**As an** operator / developer,  
**I want** the standalone crawler and database-viewer removed (or archived) and all docs and scripts to reference only books-admin-app,  
**so that** the repo has a single admin application and no confusion about which app to run.

### Acceptance Criteria

1. Standalone **crawler** and **database-viewer** top-level directories are removed (or moved to an archive path) per team policy; books-admin-app remains the only admin entrypoint and depends on crawler logic via its existing integration (e.g. package or in-process).
2. Root and CI: package.json scripts, test commands, and any CI jobs that referenced crawler or database-viewer now run or reference books-admin-app where applicable.
3. Documentation (README, runbooks, architecture, PRD) is updated to state that books-admin-app replaces crawler and database-viewer; no runbooks for running crawler or database-viewer as separate apps.
4. GrqaserApp and other consumers that use the admin API continue to point at books-admin-app (or documented equivalent); data contract and schema unchanged.

---

## Story 7.3 — Books-admin-app UI/UX polish (optional)

**As an** operator,  
**I want** the books-admin-app web UI to be consistent, clear, and aligned with a single admin experience (tabs/sections for Books, Crawler, Databases, Data management),  
**so that** I can use one interface without confusion and with improved usability.

### Acceptance Criteria

1. Navigation and layout are consistent: clear sections or tabs for Books (list/detail/search), Crawler (status, config, start/stop), Databases (active/backup), and Data management (view/edit) where applicable.
2. Visual and interaction patterns are consistent (e.g. buttons, forms, feedback messages); no leftover duplicate styles from the former database-viewer-only UI.
3. Responsive admin experience is maintained (desktop-first); key actions (start/stop crawler, set active DB, edit book) are easy to find and use.
4. Optional: accessibility and keyboard use improved where low-effort; no regression in existing behavior.

---

## Compatibility and scope

- **Functionality:** No new features beyond parity verification, removal of legacy apps, and optional UI/UX polish. Data contract and schema remain as for Epic 6.
- **Epic 5 alignment:** Epic 5 (quality, release, operations) is updated so that “crawler and database-viewer” verification and runbooks refer to books-admin-app. Story 7.1 supports that verification; Story 7.2 ensures runbooks and CI match.
- **Order:** 7.1 (parity verification) should be done before or in tandem with Epic 5 books-admin-app verification. 7.2 (removal) after parity and Epic 5 updates are agreed. 7.3 (UI/UX) can be done in parallel or after 7.2.

---

## Definition of Done

- [ ] Story 7.1: Parity documented and signed off; books-admin-app is the single admin app for crawler + viewer behavior.
- [ ] Story 7.2: crawler and database-viewer removed or archived; docs and scripts reference books-admin-app only.
- [ ] Story 7.3 (optional): UI/UX polish completed per AC; no regression.
- [ ] Epic 5 and PRD updated so delivery order and verification refer to books-admin-app.
