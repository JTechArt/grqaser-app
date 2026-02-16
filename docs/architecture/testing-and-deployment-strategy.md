# Testing and deployment strategy

Testing and deployment follow the same phase order as development: crawler first, then database-viewer, then GrqaserApp. See [delivery order and application boundaries](./delivery-order-and-application-boundaries.md).

## Testing per application

### Crawler (Phase 1)

- **Unit tests:** Parsing, normalization, validation logic. No HTML in text fields; required fields and types.
- **Integration tests:** DB writes; schema and constraints. Optional smoke test against a test page.
- **Run:** e.g. `npm test` from `crawler/`. Phase 1 sign-off includes validated crawler output and documented schema.

### Database-viewer (Phase 2)

- **Unit tests:** API handlers (books, stats, crawler, health). Config and error paths.
- **Integration tests:** API + DB (read-only). Optional UI tests.
- **Run:** e.g. `npm test` from `database-viewer/`. Phase 2 sign-off includes using the viewer to verify crawler data before Phase 3.

### GrqaserApp (Phase 3)

- **Unit / integration:** Components, state, services. Redux and API integration. Key flows (browse, search, book detail).
- **E2E:** Critical path (e.g. play a book) where feasible. iOS and Android.
- **Run:** e.g. `npm test`, `npm run lint` from `GrqaserApp/`. Builds: iOS and Android from repo; signing and env documented.

## CI

- Where applicable: single command or CI job to run crawler and database-viewer tests. GrqaserApp lint and test in CI. No phase 2 or 3 tests should assume incomplete phase 1 or 2 data.

## Deployment and runbooks

- **Crawler:** Document run instructions (env, DB path, schedule if any). How to run full crawl and validate output.
- **Database-viewer:** Document run instructions (port, DB path, CORS). How to point at crawler DB and verify data.
- **GrqaserApp:** Store submission or internal distribution steps; env and signing requirements. Document known troubleshooting (e.g. from `docs/tasks/06-TROUBLESHOOTING.md` or equivalent).

## Phase gates and QA

- QA validates crawler output and schema before Phase 1 complete; uses database-viewer to verify data before Phase 2 complete; tests mobile app only against Phase 2–validated data. See [delivery order and application boundaries](./delivery-order-and-application-boundaries.md).
