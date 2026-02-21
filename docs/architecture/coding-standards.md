# Coding standards

Minimal but critical rules for AI agents and developers. Project-specific; prevents common mistakes across the three applications.

## Critical rules

- **Phase order:** Do not implement database-viewer stories until the crawler (Phase 1) is finalized. Do not implement GrqaserApp catalog/playback stories until the database-viewer (Phase 2) has been used to validate crawler data. See [delivery order and application boundaries](./delivery-order-and-application-boundaries.md).
- **Single source of truth:** Only the crawler writes to the canonical SQLite database. Database-viewer and GrqaserApp are read-only consumers of that data.
- **Data contract:** All apps use the same schema and types. Changes to schema or required fields must be documented in [data-models-and-schema.md](./data-models-and-schema.md) and reflected in crawler first, then viewer, then app.
- **Config over hardcoding:** Crawler and database-viewer use config files (e.g. `crawler-config.js`, `config.js`) and env vars for DB path, port, CORS, rate limit, logging. Do not hardcode paths or secrets.
- **Error handling:** Crawler uses timeouts and retries with exponential backoff and jitter; retries are logged (attempt and backoff). API routes in database-viewer must return consistent error formats and appropriate HTTP status codes.
- **Naming:** Use descriptive variable and method names; follow existing project naming (camelCase for methods, PascalCase for classes, ALL_CAPS for constants where applicable). Standardize Java naming only if/when Java is introduced; for JS/TS use camelCase/PascalCase.

## Per-application notes

- **Crawler:** Keep parsing and normalization testable (unit tests); DB writes covered by integration tests. No HTML in persisted text fields; validate required fields and types before write.
- **Database-viewer:** REST API under `/api/v1/`; pagination and filters where specified in PRD. Health endpoint must reflect DB connectivity.
- **GrqaserApp:** TypeScript throughout; state via Redux Toolkit. **(Epic 8)** Catalog reads go through `src/database/catalogRepository.ts` (local SQLite), not API calls. Download and DB management through `src/services/downloadManager.ts` and `src/services/databaseManager.ts`. Handle network errors (download/stream), playback errors, and offline states with clear user feedback.

## References

- [Tech stack](./tech-stack.md) — Technologies and versions per app.
- [Delivery order and application boundaries](./delivery-order-and-application-boundaries.md) — Phase gates and role-specific rules.
