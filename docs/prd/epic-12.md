# Epic 12: MP3 Bulk Download (Books Admin App)

**Goal:** Enable administrators to bulk-download MP3 files for all books from the books-admin-app to a user-selected folder, with metadata, storage limits (e.g., 200GB per batch), multi-batch support, real-time progress, and download history.

**Scope:** books-admin-app only. Branch: `feature/download`. No GrqaserApp, authentication, or streaming changes.

---

## Problem Statement

**Current Behavior:**
- The Grqaser catalog contains ~950 books, each with one or more MP3 files (single-file or multi-chapter)
- Administrators have no way to bulk-download the catalog for archival or distribution
- Total size may exceed available storage; batches must be manageable

**Desired Outcome:**
- Admin selects a folder for downloads and configures max size (default 200GB)
- Pipeline runs in phases: create structure → create folders + metadata → download MP3s
- Each book gets its own folder with `metadata.json` and MP3 files
- When batch size approaches max, download auto-pauses; admin can start a new batch (Part 2, etc.)
- Real-time UI shows phase, book, part, size, time
- Batch history lists all runs with summary; drill-down shows per-book details

---

## User Story (Epic-Level)

**As an** administrator using books-admin-app,  
**I want** to bulk-download MP3 files for books to a selected folder, with metadata, storage limits, and batch history,  
**so that** I can archive or distribute the full audiobook catalog in manageable batches and know exactly what was downloaded and where.

---

## Story 12.1: Database Schema and Migrations

**As a** developer,  
**I want** new tables `admin_downloaded_books` and `admin_download_batches` to track downloads and batch runs,  
**so that** the app can persist download state, progress, and history.

See [Story 12.1](../stories/12.1.database-schema-and-migrations.md).

---

## Story 12.2: Backend Download Pipeline Service

**As a** developer,  
**I want** a backend service that runs the three-phase pipeline (create structure → metadata → download MP3s) with storage limit and progress reporting,  
**so that** downloads execute correctly and the UI can show real-time progress.

See [Story 12.2](../stories/12.2.backend-download-pipeline-service.md).

---

## Story 12.3: API Endpoints for Batch Control and History

**As a** frontend developer,  
**I want** REST API endpoints to start/stop a batch, get status, and retrieve batch history and detail,  
**so that** the UI can control downloads and display history.

See [Story 12.3](../stories/12.3.api-endpoints-batch-control-and-history.md).

---

## Story 12.4: UI — Download Setup and Active Download Progress

**As an** administrator,  
**I want** a download setup screen (folder picker, max size config) and an active-download view with real-time progress (phase, book, part, size, time),  
**so that** I can configure and monitor bulk downloads effectively.

See [Story 12.4](../stories/12.4.ui-download-setup-and-active-download.md).

---

## Story 12.5: UI — Batch History List and Detail

**As an** administrator,  
**I want** a list of all download batches (Part 1, Part 2, …) with summary and a drill-down to see per-book details for each batch,  
**so that** I can track what was downloaded, when, and where.

See [Story 12.5](../stories/12.5.ui-batch-history-list-and-detail.md).

---

## Implementation Order

| Phase | Story | Description |
|-------|-------|-------------|
| 1 | 12.1 | Database migrations — Create `admin_downloaded_books` and `admin_download_batches` tables. |
| 2 | 12.2 | Backend service — Download pipeline (phases 1–3), storage limit logic, progress reporting (SSE or polling). |
| 3 | 12.3 | API endpoints — Start batch, stop batch, get status, get batch history, get batch detail. |
| 4 | 12.4 | UI — Download setup + active download progress. |
| 5 | 12.5 | UI — Batch history list + batch detail view. |

---

## Compatibility and Scope

- **In scope:** books-admin-app only; SQLite for tracking; Node.js/Express for API and pipeline.
- **Out of scope:** GrqaserApp changes, streaming/playback in admin app, authentication, automatic retry of failed downloads.
- **Data:** Uses existing `books` table (main_audio_url, chapter_urls, chapter_count, file_size) per [Data models and schema](../architecture/data-models-and-schema.md).

---

## Definition of Done

- [ ] 12.1: Tables exist and migrations run; schema matches feature spec.
- [ ] 12.2: Pipeline runs in order; storage limit enforced; progress reportable.
- [ ] 12.3: All API endpoints implemented and documented.
- [ ] 12.4: Download setup and active progress UI work end-to-end.
- [ ] 12.5: Batch history list and detail views functional.
- [ ] No regression in existing books-admin-app flows.
- [ ] All acceptance criteria per story met.

---

## Related Documentation

- [Feature request: MP3 Bulk Download](../feature-requests/mp3-bulk-download-admin.md)
- [Books-admin-app architecture](../architecture/books-admin-app-architecture.md)
- [Data models and schema](../architecture/data-models-and-schema.md)
- [Story 8.2 — MP3 download storage](../stories/8.2.mp3-download-storage-and-offline-playback-cleanup.md) (GrqaserApp context)

---

**Epic Status:** Ready for Story Refinement  
**Total Stories:** 5  
**Estimated Effort:** 2–3 weeks (1 developer)  
**Priority:** High  
**Impact:** Enables catalog archival and distribution for administrators
