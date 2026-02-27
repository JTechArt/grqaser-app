# GrqaserApp data integration and audio

**Phase 3 application.** Start only after Phases 1 and 2 are complete and crawler data has been validated via **books-admin-app**. **After Epic 8:** GrqaserApp loads catalog data from a **local SQLite database** (no API calls for catalog); the books-admin-app API is no longer used for catalog reads. MP3 playback can stream (online) or play from downloaded files (offline). See [delivery order and application boundaries](./delivery-order-and-application-boundaries.md).

## Role and boundaries

- **Responsibility:** Consumer-facing mobile app. Browse catalog, search, view book details, stream or play offline audiobooks with play/pause, seek, progress, background playback, lock-screen/notification controls; user preferences (favorites, playback position, dark/light theme). Manage local catalog databases and downloaded MP3 storage.
- **Does not:** Replace or duplicate the admin app (books-admin-app). Does not write to the canonical server-side SQLite DB. Does not provide categories (removed in Epic 8).
- **Input (Epic 8):** Catalog data from a **local SQLite database** bundled with or downloaded into the app. New database files can be loaded from a **public URL** (e.g. GitHub). MP3 audio can be streamed or played from local downloads.

## App startup (Epic 10 — non-blocking initialization)

- **Problem:** When network is available, app startup can take ~30 seconds because `initializeDatabases()` blocks HomeScreen render.
- **Architecture:** Database initialization runs asynchronously in `App.tsx` (fire-and-forget). HomeScreen and other screens render immediately with a loading state. Data fetching is deferred until `dbInitialized` is true. User sees app structure (navigation, header) within 1–2 seconds regardless of network.
- **Flow:** App.tsx → `dispatch(initializeDatabases())` (non-blocking) → NavigationContainer + screens render → HomeScreen shows loading until `dbInitialized` → then fetches books. See [Epic 10 PRD](../prd/epic-10.md).
- **Performance:** Add timeouts to RNFS and SQLite operations; defer network monitor; instrument initialization phases for monitoring. Target: time to first render <2s, time to interactive <3s.

## Data integration (Epic 8 — local SQLite)

- **Source:** Local SQLite database in the app. No network requests for catalog/book list data. The app ships with (or downloads on first launch) a catalog database file.
- **Database management:** Users can load new catalog databases from a public URL (e.g. GitHub), manage multiple DB files (size, downloaded date, active), refresh without overwriting the previous version, and remove databases to free storage. When the active DB changes, all catalog data (home, search, library, book detail) reloads from the newly active DB.
- **State:** Redux Toolkit (or equivalent) with slices for books, audio, user, search, downloads, databaseManagement. Data services read from local SQLite; loading and error states handled; data shown on Home and Search.
- **Types:** Align with [Data models and schema](./data-models-and-schema.md). Audio URLs come from the local database (same books table schema as the crawler output).
- **Migration path:** If a different mobile DB type is required in the future, migration from SQLite to that DB is supported; the local DB layer is abstracted behind a repository/service interface.

## MP3 download and offline playback (Epic 8)

- **Storage allocation:** The app allocates local storage for downloaded MP3 files, tracked per book.
- **Download:** User can request to download all MP3 files for one or more books. Downloads are managed with progress indication, retry on failure, and background download support where platform allows.
- **Offline use:** When MP3s are downloaded for a book, the player uses local files; playback works without network. When MP3s are not downloaded, playback streams from the audio URL (requires network).
- **Cleanup:** In Settings, user can clean all downloaded MP3s or clean per selected book(s). After cleanup, playback falls back to streaming (online) or shows an appropriate offline message. Storage usage reflects the change.
- **Download tracking:** A local table (`downloaded_mp3s`) tracks which books have been downloaded, file paths, sizes, and download dates. See [Data models and schema](./data-models-and-schema.md).

## Audio stack

- **Playback:** Library such as react-native-track-player. Use audio URLs from the local database. If MP3 files are downloaded locally, play from local file path; otherwise stream from the URL. Play/pause, seek, progress and duration display. Background playback; lock-screen (iOS) and notification (Android) controls; handle interruptions (e.g. calls) and resume.
- **Progress and preferences:** Persist playback position per book/session; favorites toggle and persist; dark/light theme preference persisted (e.g. AsyncStorage or equivalent).

## Library behavior (Epic 8)

- **Auto-add:** When the user opens a book (book detail or starts playback), that book is automatically added to the Library section. No separate "Add to Library" action required.
- **Manual remove:** User can remove books from Library manually from the Library screen.
- **Re-open behavior:** Re-opening a previously removed book adds it back to the Library (auto-add is consistent).
- **Tracking:** Library entries are stored locally (e.g. `library_entries` table or AsyncStorage). See [Data models and schema](./data-models-and-schema.md).

## UX and navigation (Epic 8 changes)

- **Navigation:** Tab (or equivalent) for main sections; stack for detail flows. Home, Search, Library, Profile/Settings. Deep linking considered for future.
- **Categories removed (Epic 8):** The categories section is removed from the mobile app — no standalone category navigation or browse-by-category UI.
- **Advanced search (Epic 9):** An Advanced Search screen provides multi-select filters for authors, categories, duration range, and text search. Filters use AND logic. Accessible from Home and Search. Authors and categories are loaded from the local DB (same schema as books-admin-app after Epic 9). See [Epic 9 PRD](../prd/epic-9.md).
- **Screens (post–Epic 8, Epic 9):** Home (featured books), Search (full-text + advanced search entry), **Advanced Search** (author/category multi-select, duration range, text search — Epic 9), Book detail (metadata, play/download), Library (auto-added books with manual remove), full-screen and/or mini player, Profile/Settings (preferences, theme, DB management, storage/data usage, MP3 cleanup). Pull-to-refresh where applicable.
- **Settings enrichment (Epic 8):** Settings displays mobile data usage and storage usage (allocated vs used with percentage). Storage metrics stay accurate after downloads, cleanup, or DB changes.
- **Design system (Epic 7):** GrqaserApp UI follows the same design system as books-admin-app: colors (slate + teal), typography (Plus Jakarta Sans). Mockups in `docs/design/grqaser-app/` (Story 7.3); implementation in Story 7.5. No purple gradient; mobile frame (e.g. max-width 390px) and bottom tab navigation as in mockups.
- **NFRs:** Network and playback errors surfaced to user; offline messages when streaming unavailable and MP3 not downloaded; target iOS and Android with single codebase (React Native).

## Project structure (GrqaserApp — post–Epic 8)

- **Entry:** React Native app entry (e.g. `index.js`, `App.tsx`).
- **Structure:** screens, navigation, state, services, database, types, shared constants. TypeScript, ESLint, Prettier, path aliases as configured.
- **New modules (Epic 8):**
  - `src/database/` — SQLite initialization, repository/service interface for reading catalog data from the active local DB. Abstracts DB access for future migration.
  - `src/services/databaseManager.ts` — Load DB from URL, list managed DBs (size, date, active), refresh, remove, switch active DB, trigger catalog reload.
  - `src/services/downloadManager.ts` — Download MP3 files per book, track download state, delete downloads (all or per-book), report storage usage.
  - `src/state/slices/downloadSlice.ts` — Redux state for download progress, downloaded books, storage usage.
  - `src/state/slices/databaseSlice.ts` — Redux state for managed databases, active DB, reload triggers, **dbInitialized** (Epic 10).
  - `src/state/slices/librarySlice.ts` — Redux state for library entries (auto-add on open, manual remove).
- **Epic 9 modules:**
  - `src/screens/AdvancedSearchScreen.tsx` — Advanced search with author/category multi-select, duration filter, text search.
  - `src/services/catalogRepository.ts` — Extended for filter params (author_ids, category_ids, duration_range, text).

## References

- Epic 3 (GrqaserApp foundation), Epic 4 (Audio and playback), Epic 7 (design system and GrqaserApp UI/UX — Stories 7.3, 7.5), **Epic 8 (local data, offline playback, settings)**, **Epic 9 (advanced search)**, **Epic 10 (app startup performance)**. PRD FR8–FR13, NFR3–NFR5.
- [Data models and schema](./data-models-and-schema.md) — Shared books table schema (used in local DB); mobile-specific schemas for downloads, library, DB management.
- [Books-admin-app architecture](./books-admin-app-architecture.md) — Produces the canonical DB that is exported/hosted for GrqaserApp to download; design system in docs/design/.
- [Tech stack](./tech-stack.md) — GrqaserApp row; mobile SQLite, file system, and download libraries (Epic 8).
- [Testing and deployment strategy](./testing-and-deployment-strategy.md) — Offline and local DB testing.
