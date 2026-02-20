# Grqaser Architecture Document

This document is the single source of truth for the Grqaser ecosystem. **After Epic 7:** the admin surface is a single application — **books-admin-app** (crawler + database-viewer behavior merged); the mobile app is **GrqaserApp**. Standalone crawler and database-viewer are removed or archived (Epic 7.2). Design system and UI/UX mockups live in `docs/design/` (Epic 7.3–7.5). **After Epic 8:** GrqaserApp loads catalog from local SQLite (no API), supports offline MP3 playback, manages multiple DB versions from internet, auto-adds opened books to Library, and removes categories. The document aligns with [docs/prd.md](../prd.md) and defines the technical architecture for AI-driven development.

## Critical: Read This First

**Delivery order and application boundaries** define how work is sequenced and which app is the single admin entrypoint. See:

- **[Delivery order and application boundaries](./delivery-order-and-application-boundaries.md)** — **Mandatory reading.** Defines phases, books-admin-app as the only admin app (post–Epic 7), and rules for all workers.

## Sections

- [Delivery order and application boundaries](./delivery-order-and-application-boundaries.md) — Phases, single admin app (books-admin-app), rules for all workers
- [Tech stack](./tech-stack.md) — Technologies and versions per application; design system reference
- [Source tree (unified project structure)](./source-tree.md) — Monorepo layout; books-admin-app, GrqaserApp, docs/design
- [Crawler pipeline and data contract](./crawler-pipeline-and-data-contract.md) — Crawler behavior (preserved in books-admin-app; standalone removed/archived)
- [Database-viewer API and deployment](./database-viewer-api-and-deployment.md) — Viewer/API behavior (preserved in books-admin-app; standalone removed/archived)
- [Books-admin-app architecture](./books-admin-app-architecture.md) — Single admin app: crawler + viewer, DB versioning, crawler control, data edit, design system and UI/UX (Epic 7)
- **Parity (Epic 1/2 → books-admin-app):** [docs/parity-books-admin-app.md](../parity-books-admin-app.md) — AC-to-feature mapping and sign-off for Epic 5 verification and Story 7.2 removal
- [GrqaserApp data integration and audio](./grqaserapp-data-integration-and-audio.md) — Mobile app; **local SQLite catalog, offline playback, DB management, library auto-add (Epic 8)**; UI/UX from docs/design (Epic 7)
- [Data models and schema](./data-models-and-schema.md) — Shared data contract and SQLite schema
- [Testing and deployment strategy](./testing-and-deployment-strategy.md) — Tests and runbooks; admin via books-admin-app only (post–Epic 7)
- [Coding standards](./coding-standards.md) — Rules for dev agents and consistency

**Design system:** Colors (slate + teal), typography (Plus Jakarta Sans), and mockups for books-admin-app and GrqaserApp are in `docs/design/` (see [Epic 7](../prd/epic-7.md) Stories 7.3–7.5).

**Post–Story 7.2:** Standalone crawler and database-viewer are under `archive/`; books-admin-app is the only admin entrypoint. Runbooks and verification refer to books-admin-app only (see [parity doc](../parity-books-admin-app.md)).

## Change log

| Date       | Version | Description                    | Author     |
|-----------|---------|--------------------------------|------------|
| 2025-02-14 | 1.0     | Initial architecture from PRD  | Architect  |
| 2025-02-15 | 1.1     | Crawler modes, config merge, retry/validation/dedup (Stories 1.5, 1.6) | Architect  |
| 2025-02-16 | 1.2     | Epic 6: books-admin-app architecture (merge crawler+viewer, DB versioning, crawler control, data edit) | Architect  |
| 2025-02-17 | 1.3     | Epic 7: books-admin-app single admin app; crawler/database-viewer removed or archived; design system and docs/design/ (mockups, UI/UX) | Architect  |
| 2026-02-19 | 1.4     | Epic 8: GrqaserApp local SQLite catalog (no API), offline MP3 download/playback, DB management from internet, library auto-add, categories removed, Settings enrichment | Architect (Winston) |
