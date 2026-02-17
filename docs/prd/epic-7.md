# Epic 7: Remove crawler and database-viewer; UI/UX for books-admin-app and GrqaserApp

**Prerequisite:** Epic 6 (books-admin-app) is complete. books-admin-app is the merge of crawler and database-viewer; it provides the same functionality in a single application.

**Goal:** (1) Once books-admin-app has been verified to match crawler and database-viewer functionality (per Epics 1 and 2), remove the standalone crawler and database-viewer. (2) **UI/UX improvements for both the books-admin-app (web) and GrqaserApp (mobile):** a single design system (slate + teal, Plus Jakarta Sans), HTML mockups in `docs/design/`, and separate stories to implement or update both applications to follow the mockups and design rules.

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

## Story 7.3 — Design system and UI/UX mockups (books-admin-app and GrqaserApp)

**As a** designer / developer,  
**I want** a single design system and static HTML mockups for both books-admin-app (web) and GrqaserApp (mobile) in the main docs folder,  
**so that** both applications share the same design rules, colors, and typography and we have a shared reference for implementation.

### Acceptance Criteria

1. **Design system** is documented in `docs/design/README.md`: colors (slate + teal), typography (Plus Jakarta Sans), radii, and usage for web vs mobile.
2. **Mockups live under `docs/design/`** (main docs folder): `docs/design/index.html` is the design hub (entry to all mockups); `docs/design/books-admin-app/` contains HTML mockups for Dashboard, Books, Crawler, Databases, Book detail/edit; `docs/design/grqaser-app/` contains HTML mockups for Home, Book detail, Library, Audio player, Profile.
3. **GrqaserApp mockups** follow the same design rules and colors as books-admin-app (teal accent, slate background/text, no purple gradient); mobile frame (e.g. max-width 390px) and bottom tab navigation as appropriate.
4. All mockups are static HTML (no backend); opening `docs/design/index.html` in a browser allows navigating to every mock view. Sidebar (web) and bottom nav (mobile) link back to the design hub or between mock pages as appropriate.

---

## Story 7.4 — Books-admin-app UI/UX implementation from mockups

**As an** operator,  
**I want** the books-admin-app web UI to match the design system and mockups in `docs/design/books-admin-app/`,  
**so that** the admin experience is consistent, clear, and aligned with the defined layout and patterns.

### Acceptance Criteria

1. Books-admin-app (layout, navigation, colors, typography, components) **matches or aligns with** the mockups in `docs/design/books-admin-app/` and the design system in `docs/design/README.md`.
2. Navigation and layout are consistent: sidebar (or equivalent), same sections (Dashboard, Books, Crawler, Databases); visual and interaction patterns (buttons, forms, cards) follow the design system.
3. No regression in existing behavior; key actions (start/stop crawler, set active DB, edit book) remain easy to find and use.
4. Optional: accessibility and keyboard use improved where low-effort.

---

## Story 7.5 — GrqaserApp UI/UX implementation from mockups

**As a** mobile user / developer,  
**I want** GrqaserApp (React Native) to follow the same design system and mockups in `docs/design/grqaser-app/`,  
**so that** the mobile experience is visually and behaviorally consistent with the design system and matches the mockups (Home, Book detail, Library, Player, Profile).

### Acceptance Criteria

1. GrqaserApp (colors, typography, components, navigation) **matches or aligns with** the mockups in `docs/design/grqaser-app/` and the design system in `docs/design/README.md` (teal accent, slate palette, Plus Jakarta Sans or equivalent).
2. Core screens (Home, Search, Book detail, Audio player, Library/Profile) follow the structure and patterns shown in the mockups; bottom tab (or equivalent) navigation is clear.
3. No regression in existing behavior; browse → book detail → listen flow remains intact.
4. Optional: theme (dark/light) and accessibility improvements where low-effort.

---

## Compatibility and scope

- **Functionality:** No new features beyond parity verification, removal of legacy apps, and UI/UX improvements. Data contract and schema remain as for Epic 6.
- **Design:** One design system for both books-admin-app and GrqaserApp; mockups in docs/design/; implementation stories (7.4, 7.5) update the apps to follow mockups and design rules.
- **Epic 5 alignment:** Epic 5 (quality, release, operations) is updated so that “crawler and database-viewer” verification and runbooks refer to books-admin-app. Story 7.1 supports that verification; Story 7.2 ensures runbooks and CI match.
- **Order:** 7.1 (parity) before or in tandem with Epic 5 verification. 7.2 (removal) after parity and Epic 5 updates. 7.3 (design system and mockups) can be done in parallel. 7.4 (books-admin-app UI/UX) and 7.5 (GrqaserApp UI/UX) can be done in parallel after or alongside 7.3.

---

## Definition of Done

- [ ] Story 7.1: Parity documented and signed off; books-admin-app is the single admin app for crawler + viewer behavior.
- [ ] Story 7.2: crawler and database-viewer removed or archived; docs and scripts reference books-admin-app only.
- [ ] Story 7.3: Design system in docs/design/README.md; design hub docs/design/index.html; mockups in docs/design/books-admin-app/ and docs/design/grqaser-app/; GrqaserApp mockups use same design rules as books-admin-app.
- [ ] Story 7.4: books-admin-app UI/UX updated to match mockups and design system; no regression.
- [ ] Story 7.5: GrqaserApp UI/UX updated to match mockups and design system; no regression.
- [ ] Epic 5 and PRD updated so delivery order and verification refer to books-admin-app.
