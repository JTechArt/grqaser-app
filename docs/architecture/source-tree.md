# Source tree (unified project structure)

Monorepo layout. **After Epic 7:** the only admin application is **books-admin-app**; standalone **crawler/** and **database-viewer/** are **removed or archived** (Story 7.2). GrqaserApp consumes the books-admin-app API. Design system and mockups live under `docs/design/` (Epic 7.3–7.5). Shared data contract: [Data models and schema](./data-models-and-schema.md). See [delivery order](./delivery-order-and-application-boundaries.md).

## Root layout (post–Epic 7)

```
grqaser/
├── books-admin-app/         # Single admin app — crawler + viewer, DB versioning, crawler control, data edit (Epic 6–7)
├── GrqaserApp/              # Mobile app — consumes books-admin-app API
├── docs/
│   ├── prd.md
│   ├── design/              # Epic 7.3–7.5 — design system and UI/UX mockups
│   │   ├── README.md         # Design system (slate + teal, Plus Jakarta Sans)
│   │   ├── index.html        # Design hub — entry to all mockups
│   │   ├── books-admin-app/  # HTML mockups: Dashboard, Books, Crawler, Databases, Book detail/edit
│   │   └── grqaser-app/      # HTML mockups: Home, Book detail, Library, Audio player, Profile
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
├── package.json             # Root — scripts/CI reference books-admin-app only (post–Epic 7)
└── README.md
```

**Optional (per team policy):** `archive/crawler/` and `archive/database-viewer/` if legacy code is retained for reference; otherwise those directories are removed. No active development in crawler or database-viewer as standalone apps.

## Books-admin-app (`books-admin-app/`) — single admin application (Epic 6–7)

- **Role:** Single local admin app: crawler behavior, DB versioning (active/backup), crawler start/stop and config, data view + edit. Replaces standalone crawler and database-viewer. No auth; local-only.
- **Key dirs:** `src/` (server, config, routes, models/db, crawler as library or subprocess), `public/` (web UI). Same schema and data contract as documented in data-models-and-schema.
- **Entry:** `src/server.js`. See [Books-admin-app architecture](./books-admin-app-architecture.md) for run model, DB versioning, API, and design system/UI/UX (Epic 7).
- **UI/UX:** Follow design system in `docs/design/README.md` and mockups in `docs/design/books-admin-app/` (Stories 7.3–7.4).

## GrqaserApp (`GrqaserApp/`)

- **Role:** Phase 3 mobile app. Consumes data via **books-admin-app API** (or agreed export). Do not start catalog/playback work until crawler data has been validated via books-admin-app.
- **Key dirs:** `src/` (screens, navigation, state, services, types), `android/`, `ios/`.
- **Entry:** App entry per React Native (e.g. `index.js` / `App.tsx`).
- **UI/UX:** Follow design system in `docs/design/README.md` and mockups in `docs/design/grqaser-app/` (Stories 7.3, 7.5).

## Design and mockups (`docs/design/`) — Epic 7.3–7.5

- **README.md:** Design system — colors (slate + teal), typography (Plus Jakarta Sans), radii, usage for web vs mobile.
- **index.html:** Design hub — open in browser to navigate to all mockups (static HTML, no backend).
- **books-admin-app/:** HTML mockups for Dashboard, Books, Crawler, Databases, Book detail/edit.
- **grqaser-app/:** HTML mockups for Home, Book detail, Library, Audio player, Profile (mobile frame, same design rules).

## File placement rules (post–Epic 7)

- **New admin code:** Under `books-admin-app/src/` only (server, routes, config, models/db, crawler); static UI in `books-admin-app/public/`. Follow [books-admin-app architecture](./books-admin-app-architecture.md) and `docs/design/` mockups.
- **New GrqaserApp code:** Under `GrqaserApp/src/` (screens, services, state, types). Use path aliases if configured. API base: books-admin-app.
- **Design/mockup changes:** Under `docs/design/` (README.md, index.html, books-admin-app/, grqaser-app/).
- **Shared types/schema:** Document in `docs/architecture/data-models-and-schema.md`; duplicate minimal types in each app or use a shared package only if introduced explicitly.

## Legacy crawler and database-viewer (removed or archived)

- **Crawler:** Standalone `crawler/` is **removed or archived** (Epic 7.2). Crawler behavior is preserved inside books-admin-app (in-process or subprocess). For preserved behavior and schema, see [Crawler pipeline and data contract](./crawler-pipeline-and-data-contract.md).
- **Database-viewer:** Standalone `database-viewer/` is **removed or archived** (Epic 7.2). Viewer/API behavior is preserved in books-admin-app. For preserved API and behavior, see [Database-viewer API and deployment](./database-viewer-api-and-deployment.md).

## Dev agent reference

Use this source tree and [delivery order and application boundaries](./delivery-order-and-application-boundaries.md). All admin work goes into **books-admin-app**; GrqaserApp consumes **books-admin-app API**. Do not add features to standalone crawler or database-viewer (they are removed or archived).
