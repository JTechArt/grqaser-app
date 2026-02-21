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

**Legacy (Story 7.2):** Standalone `crawler/` and `database-viewer/` have been moved to `archive/crawler/` and `archive/database-viewer/`. books-admin-app depends on the crawler via `grqaser-crawler` (file link to `archive/crawler`). No runbooks for running crawler or database-viewer as separate apps.

## Books-admin-app (`books-admin-app/`) — single admin application (Epic 6–7)

- **Role:** Single local admin app: crawler behavior, DB versioning (active/backup), crawler start/stop and config, data view + edit. Replaces standalone crawler and database-viewer. No auth; local-only.
- **Key dirs:** `src/` (server, config, routes, models/db, crawler as library or subprocess), `public/` (web UI). Same schema and data contract as documented in data-models-and-schema.
- **Entry:** `src/server.js`. See [Books-admin-app architecture](./books-admin-app-architecture.md) for run model, DB versioning, API, and design system/UI/UX (Epic 7).
- **UI/UX:** Follow design system in `docs/design/README.md` and mockups in `docs/design/books-admin-app/` (Stories 7.3–7.4).

## GrqaserApp (`GrqaserApp/`) — updated for Epic 8

- **Role:** Phase 3 mobile app. **After Epic 8:** reads catalog from a **local SQLite database** (no API calls for catalog); downloads and plays MP3s offline; manages multiple DB versions; auto-adds opened books to Library.
- **Key dirs:** `src/` (screens, navigation, state, services, database, types), `android/`, `ios/`.
- **Entry:** App entry per React Native (e.g. `index.js` / `App.tsx`).
- **UI/UX:** Follow design system in `docs/design/README.md` and mockups in `docs/design/grqaser-app/` (Stories 7.3, 7.5). Categories section removed (Epic 8).

### GrqaserApp source layout (post–Epic 8)

```
GrqaserApp/src/
├── screens/
│   ├── HomeScreen.tsx          # Featured books (no categories)
│   ├── SearchScreen.tsx        # Full-text search over local DB
│   ├── BookDetailScreen.tsx    # Metadata, play, download
│   ├── LibraryScreen.tsx       # Auto-added books, manual remove
│   ├── PlayerScreen.tsx        # Full-screen player
│   ├── ProfileScreen.tsx       # User profile
│   ├── SettingsScreen.tsx      # Theme, DB management, storage/data usage, MP3 cleanup
│   └── FavoritesScreen.tsx     # Favorites list
├── navigation/
│   ├── RootNavigator.tsx
│   ├── types.ts
│   └── deepLinking.ts
├── state/
│   ├── index.ts
│   └── slices/
│       ├── booksSlice.ts
│       ├── playerSlice.ts
│       ├── userSlice.ts
│       ├── downloadSlice.ts      # (Epic 8) MP3 download state
│       ├── databaseSlice.ts      # (Epic 8) Managed DBs, active DB
│       └── librarySlice.ts       # (Epic 8) Library auto-add/remove
├── services/
│   ├── booksApi.ts               # (Epic 8) Replaced by local DB reads; retained for streaming URL resolution
│   ├── apiConfig.ts
│   ├── bookMapper.ts
│   ├── playerService.ts
│   ├── playbackService.ts
│   ├── preferencesStorage.ts
│   ├── databaseManager.ts        # (Epic 8) Load/list/refresh/remove/switch DBs
│   └── downloadManager.ts        # (Epic 8) Download/delete MP3s, storage metrics
├── database/                     # (Epic 8) Local SQLite access
│   ├── connection.ts             # Open/close SQLite connections
│   ├── catalogRepository.ts      # Read books, search, metadata from active catalog DB
│   └── appMetaRepository.ts      # Read/write managed_databases, downloaded_mp3s, library_entries
├── components/
│   ├── BookCard.tsx
│   ├── MiniPlayer.tsx
│   ├── AudioSpeedControl.tsx
│   └── TrackPlayerProvider.tsx
├── types/
│   └── book.ts                   # (Epic 8) Add ManagedDatabase, DownloadedMp3, LibraryEntry, StorageUsage
├── theme/
│   └── index.ts
├── utils/
│   └── formatters.ts
├── constants/
│   └── index.ts
└── store/
    └── index.ts
```

**Removed (Epic 8):** `CategoryScreen.tsx`, `CategoryCard.tsx` — categories section is removed from the app.

## Design and mockups (`docs/design/`) — Epic 7.3–7.5

- **README.md:** Design system — colors (slate + teal), typography (Plus Jakarta Sans), radii, usage for web vs mobile.
- **index.html:** Design hub — open in browser to navigate to all mockups (static HTML, no backend).
- **books-admin-app/:** HTML mockups for Dashboard, Books, Crawler, Databases, Book detail/edit.
- **grqaser-app/:** HTML mockups for Home, Book detail, Library, Audio player, Profile (mobile frame, same design rules).

## File placement rules (post–Epic 7, updated for Epic 8)

- **New admin code:** Under `books-admin-app/src/` only (server, routes, config, models/db, crawler); static UI in `books-admin-app/public/`. Follow [books-admin-app architecture](./books-admin-app-architecture.md) and `docs/design/` mockups.
- **New GrqaserApp code:** Under `GrqaserApp/src/` (screens, services, state, database, types). Use path aliases if configured. **(Epic 8)** Local DB access in `src/database/`; download and DB management services in `src/services/`; new Redux slices in `src/state/slices/`.
- **Design/mockup changes:** Under `docs/design/` (README.md, index.html, books-admin-app/, grqaser-app/).
- **Shared types/schema:** Document in `docs/architecture/data-models-and-schema.md`; duplicate minimal types in each app or use a shared package only if introduced explicitly.

## Legacy crawler and database-viewer (removed or archived)

- **Crawler:** Standalone `crawler/` is **removed or archived** (Epic 7.2). Crawler behavior is preserved inside books-admin-app (in-process or subprocess). For preserved behavior and schema, see [Crawler pipeline and data contract](./crawler-pipeline-and-data-contract.md).
- **Database-viewer:** Standalone `database-viewer/` is **removed or archived** (Epic 7.2). Viewer/API behavior is preserved in books-admin-app. For preserved API and behavior, see [Database-viewer API and deployment](./database-viewer-api-and-deployment.md).

## Dev agent reference

Use this source tree and [delivery order and application boundaries](./delivery-order-and-application-boundaries.md). All admin work goes into **books-admin-app**. **(Epic 8)** GrqaserApp reads catalog from **local SQLite** (not the API); new local DB, download, and library modules go under `GrqaserApp/src/database/` and `GrqaserApp/src/services/`. Do not add features to standalone crawler or database-viewer (they are removed or archived).
