# Source tree (unified project structure)

Monorepo layout for the three applications. Each app is self-contained; shared data contract is documented in [Data models and schema](./data-models-and-schema.md). Follow [delivery order](./delivery-order-and-application-boundaries.md) when adding or changing code.

## Root layout

```
grqaser/
├── crawler/                 # Phase 1 — Data crawler (single source of truth for DB)
├── database-viewer/         # Phase 2 — Admin panel (API + web UI)
├── books-admin-app/         # Epic 6 — Merged crawler + viewer; DB versioning; crawler control; data edit
├── GrqaserApp/              # Phase 3 — Mobile app (consumes crawler data)
├── docs/
│   ├── prd.md
│   ├── architecture/        # This architecture (sharded)
│   │   ├── index.md
│   │   ├── delivery-order-and-application-boundaries.md
│   │   ├── tech-stack.md
│   │   ├── source-tree.md
│   │   ├── crawler-pipeline-and-data-contract.md
│   │   ├── database-viewer-api-and-deployment.md
│   │   ├── books-admin-app-architecture.md
│   │   ├── grqaserapp-data-integration-and-audio.md
│   │   ├── data-models-and-schema.md
│   │   ├── testing-and-deployment-strategy.md
│   │   └── coding-standards.md
│   ├── stories/             # User stories (devStoryLocation)
│   └── tasks/
├── package.json             # Root (if used for workspace scripts)
└── README.md
```

## Crawler (`crawler/`)

- **Role:** Phase 1. Writes to SQLite only. No dependency on database-viewer or GrqaserApp.
- **Key dirs:** `src/` (config, models, schema, utils, crawler entry), `data/` (grqaser.db), `logs/` (optional).
- **Entry:** `src/crawler.js` — single entrypoint; mode (full, update, fix-download-all, full-database, test) via config or CLI (Story 1.5). Config in `src/config/crawler-config.js`. Schema: `src/schema/books-table.js`.
- **Deprecated/removed:** `improved-crawler.js`, `full-database-crawler.js`, `fix-download-all-crawler.js` are superseded by the main crawler with modes; `test-crawler.js` may remain as a thin wrapper for `--mode=test`.

## Database-viewer (`database-viewer/`)

- **Role:** Phase 2. Reads from same SQLite DB; provides REST API and web UI. Used to verify crawler data before Phase 3.
- **Key dirs:** `src/` (config, models, routes, server), `public/` (web UI), `data/` (optional local DB copy), `logs/` (optional).
- **Entry:** `src/server.js`. Config: port, DB path, CORS, rate limit, logging (env or config).

## Books-admin-app (`books-admin-app/`) — Epic 6

- **Role:** Brownfield consolidation of crawler + database-viewer. Single local admin app: run crawler, manage DB versioning (active/backup), crawler start/stop and config, view and edit data. No auth; local-only.
- **Key dirs:** `src/` (server, config, routes, models/db, crawler as library or subprocess), `public/` (web UI). Reuses same schema and data contract as crawler/viewer.
- **Entry:** `src/server.js`. See [Books-admin-app architecture](./books-admin-app-architecture.md) for run model, DB versioning, API extensions, and project structure.
- **Relationship:** Code and behavior from `crawler/` and `database-viewer/` are merged or invoked from books-admin-app; those directories may remain in repo for rollback.

## GrqaserApp (`GrqaserApp/`)

- **Role:** Phase 3. Consumes data via database-viewer API or agreed export. Do not start catalog/playback work until Phase 2 has validated data.
- **Key dirs:** `src/` (screens, navigation, state, services, types), `android/`, `ios/`.
- **Entry:** App entry per React Native (e.g. `index.js` / `App.tsx`).

## File placement rules

- **New crawler code:** Under `crawler/src/`; respect existing config and models.
- **New database-viewer code:** Under `database-viewer/src/` (routes, models, config); static assets in `public/`.
- **New books-admin-app code:** Under `books-admin-app/src/` (server, routes, config, models/db, crawler); static assets in `books-admin-app/public/`. Follow [books-admin-app architecture](./books-admin-app-architecture.md).
- **New GrqaserApp code:** Under `GrqaserApp/src/` (screens, services, state, types). Use path aliases if configured.
- **Shared types/schema:** Document in `docs/architecture/data-models-and-schema.md`; duplicate minimal types in each app or use a shared package only if introduced explicitly.

## Dev agent reference

When implementing stories, use this source tree and the phase order in [delivery order and application boundaries](./delivery-order-and-application-boundaries.md). Do not create features in Phase 2 or 3 that assume Phase 1 or 2 is incomplete.
