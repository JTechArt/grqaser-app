# Testing and deployment strategy

Testing and deployment follow the same phase order as development. **After Epic 7:** admin testing and runbooks refer to **books-admin-app** only; standalone crawler and database-viewer are removed or archived (Story 7.2). See [delivery order and application boundaries](./delivery-order-and-application-boundaries.md).

## Testing per application (post–Epic 7)

### Books-admin-app (single admin app — crawler + viewer behavior)

- **Unit tests:** Crawler logic (parsing, normalization, validation); API handlers (books, stats, crawler, health, DB versioning, data edit). Config and error paths.
- **Integration tests:** DB writes (crawler); API + DB (read and write); optional UI tests. Verify crawler output and viewer/API behavior through the single app.
- **Run:** e.g. `npm test` from `books-admin-app/`. Phase 1 and 2 sign-off is achieved via books-admin-app (crawler behavior validated, then viewer/API used to verify data).

### GrqaserApp (Phase 3; updated for Epic 8)

- **Unit / integration:** Components, state, services. Redux slices (books, audio, user, search, downloads, databaseManagement, library). Local SQLite repository tests (catalog reads, metadata writes). Key flows (browse, search, book detail, library auto-add).
- **Local DB tests (Epic 8):** Verify catalog reads from local SQLite; test DB switch triggers full data reload; test managed_databases CRUD; test downloaded_mp3s tracking and cleanup.
- **Offline tests (Epic 8):** Verify playback works from downloaded MP3s with no network; verify appropriate offline messages when streaming unavailable and MP3 not downloaded; verify catalog browsing/search works offline (local DB).
- **Download manager tests (Epic 8):** Test MP3 download, progress tracking, cleanup (all and per-book); verify storage metrics update correctly.
- **E2E:** Critical path (e.g. play a book, download for offline, switch DB) where feasible. iOS and Android.
- **Run:** e.g. `npm test`, `npm run lint` from `GrqaserApp/`. Builds: iOS and Android from repo; signing and env documented.

## CI (post–Epic 7)

- Single command or CI job to run **books-admin-app** tests (crawler + viewer behavior). GrqaserApp lint and test in CI. No Phase 3 tests should assume incomplete Phase 1 or 2 data (verified via books-admin-app).

### Books-admin-app: single command and pipeline

- **Single command:** From repo root run `npm run admin:test`, or from `books-admin-app/` run `npm test`. This runs the full Jest suite (crawler unit tests, API route tests, DB versioning tests, crawler smoke/integration).
- **CI job:** A pipeline (e.g. GitHub Actions) should run books-admin-app tests with the same command. Example: `cd books-admin-app && npm ci && npm test`. Use Node LTS matching `books-admin-app/package.json` engines. Do not assume Epic 6 or Phase 2 data exists; tests use in-process or temporary test DBs.

## Deployment and runbooks (post–Epic 7)

- **Books-admin-app:** Document run instructions (port, active DB path, crawler config, env). How to run full crawl, validate output, and use the web UI for books/stats/crawler/DB versioning/data edit. No separate runbooks for standalone crawler or database-viewer.
- **GrqaserApp:** Store submission or internal distribution steps; env and signing requirements. **(Epic 8)** Document the public URL for catalog DB downloads; document default/bundled DB if applicable. Document storage allocation and cleanup procedures for users. Known troubleshooting (e.g. from `docs/tasks/06-TROUBLESHOOTING.md` or equivalent).

## Phase gates and QA

- QA validates crawler and viewer behavior **via books-admin-app**. Phase 1/2 complete when books-admin-app crawler runs successfully and books-admin-app API/web UI have been used to verify data. Test the mobile app only against data validated through books-admin-app. See [delivery order and application boundaries](./delivery-order-and-application-boundaries.md).
