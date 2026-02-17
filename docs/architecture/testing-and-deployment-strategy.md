# Testing and deployment strategy

Testing and deployment follow the same phase order as development. **After Epic 7:** admin testing and runbooks refer to **books-admin-app** only; standalone crawler and database-viewer are removed or archived (Story 7.2). See [delivery order and application boundaries](./delivery-order-and-application-boundaries.md).

## Testing per application (post–Epic 7)

### Books-admin-app (single admin app — crawler + viewer behavior)

- **Unit tests:** Crawler logic (parsing, normalization, validation); API handlers (books, stats, crawler, health, DB versioning, data edit). Config and error paths.
- **Integration tests:** DB writes (crawler); API + DB (read and write); optional UI tests. Verify crawler output and viewer/API behavior through the single app.
- **Run:** e.g. `npm test` from `books-admin-app/`. Phase 1 and 2 sign-off is achieved via books-admin-app (crawler behavior validated, then viewer/API used to verify data).

### GrqaserApp (Phase 3)

- **Unit / integration:** Components, state, services. Redux and API integration (books-admin-app API). Key flows (browse, search, book detail).
- **E2E:** Critical path (e.g. play a book) where feasible. iOS and Android.
- **Run:** e.g. `npm test`, `npm run lint` from `GrqaserApp/`. Builds: iOS and Android from repo; signing and env documented.

## CI (post–Epic 7)

- Single command or CI job to run **books-admin-app** tests (crawler + viewer behavior). GrqaserApp lint and test in CI. No Phase 3 tests should assume incomplete Phase 1 or 2 data (verified via books-admin-app).

## Deployment and runbooks (post–Epic 7)

- **Books-admin-app:** Document run instructions (port, active DB path, crawler config, env). How to run full crawl, validate output, and use the web UI for books/stats/crawler/DB versioning/data edit. No separate runbooks for standalone crawler or database-viewer.
- **GrqaserApp:** Store submission or internal distribution steps; env and signing requirements; API base (books-admin-app). Document known troubleshooting (e.g. from `docs/tasks/06-TROUBLESHOOTING.md` or equivalent).

## Phase gates and QA

- QA validates crawler and viewer behavior **via books-admin-app**. Phase 1/2 complete when books-admin-app crawler runs successfully and books-admin-app API/web UI have been used to verify data. Test the mobile app only against data validated through books-admin-app. See [delivery order and application boundaries](./delivery-order-and-application-boundaries.md).
