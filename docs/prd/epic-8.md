# Epic 8: GrqaserApp local data, offline playback, and settings

**Prerequisite:** GrqaserApp (Epics 3–4, 7) is in place. This epic changes the mobile app from API-backed catalog to local SQLite, adds MP3 download/offline and DB update from internet, removes categories, adds Library auto-add, and enriches Settings.

**Goal:** (1) Remove network dependency for catalog: load and read from SQLite (or migrated DB) in the app with no API calls for catalog data. (2) Allow users to download MP3s for selected books and use the app offline, with cleanup (all or per-book). (3) Let users load new catalog databases from a public GitHub file, manage multiple DBs (size, date, active), refresh without overwriting, and remove DBs; reload data when DB changes. (4) Remove the categories section from the mobile app. (5) Automatically add opened books to Library with optional manual remove. (6) Enrich Settings with mobile data usage and storage usage (allocated vs used with percentage).

---

## Story 8.1 — Local SQLite catalog (remove API dependency) and remove categories

**As a** mobile user / developer,  
**I want** the app to load all catalog data from a local SQLite database with no network calls for catalog, and I want the categories section removed from the app,  
**so that** the app works fully from local data and the UI no longer shows categories.

### Acceptance Criteria

1. **No API for catalog:** Catalog data (books, search, metadata) is read only from a local database in the app; no network requests are made to load catalog or book list data.
2. **SQLite in app:** The books database is loaded and used locally (SQLite). If a different mobile DB type is required later, migration from SQLite to that DB is supported; all data is available for such migration.
3. **Categories removed:** The categories section is removed from the mobile app (navigation, filters, and any category-based UI are removed).
4. Existing browse, search, and book-detail flows work using the local DB only; no regression in core navigation or display.

---

## Story 8.2 — MP3 download storage and offline playback cleanup

**As a** mobile user,  
**I want** to allocate storage for downloaded MP3s, download all MP3 files for selected book(s), use the app offline for those books, and clean up storage (all or for selected books) from Settings,  
**so that** I can listen without network and manage storage when needed.

### Acceptance Criteria

1. **Storage allocation:** The app allocates and uses local storage for downloaded MP3 files (e.g., per-book or per-title as defined).
2. **Download:** User can request to download all MP3 files for one or more books (e.g., “download all for these 2 books”); download completes and files are stored locally.
3. **Offline use:** When MP3s are downloaded, the user can use the app offline to play those books without network.
4. **Cleanup in Settings:** In Settings, user can clean up downloaded data with options: **clean all** (remove all downloaded MP3s) or **clean for selected book(s)** (remove downloads for chosen books only).
5. After cleanup, playback for removed books falls back to streaming (when online) or shows appropriate offline message; storage usage reflects the change.

---

## Story 8.3 — Database management from internet (load, list, refresh, remove, reload)

**As a** mobile user,  
**I want** to load new catalog databases from a public file on the internet (e.g., GitHub), see loaded DBs in Settings (size, downloaded date, active), refresh to get a new version without overwriting the old one, remove DBs to free storage, and have all data reload when I load a new DB or change the active DB,  
**so that** I can update the catalog and manage multiple DB versions safely.

### Acceptance Criteria

1. **Load from internet:** User can load a new database from a public URL (e.g., a file hosted on GitHub); the DB file is downloaded and stored in the app.
2. **Settings: list DBs:** In Settings, user sees all loaded databases with: size, downloaded date, and which one is **active**. Only the active DB is used for catalog data.
3. **Refresh:** A “Refresh” action fetches the new version of the DB from the internet and stores it **alongside** the existing one (does not overwrite the old DB).
4. **Remove DBs:** User can remove one or more DBs from Settings to free storage; the active DB cannot be removed until another is set active (or similar safeguard).
5. **Reload on change:** When the user loads a new DB or changes the active DB version, all catalog and related data in the app are reloaded from the newly active DB (e.g., home, search, library, book detail reflect the new data).
6. Existing flows (browse, search, play) continue to work after DB change; no stale data from the previous DB.

---

## Story 8.4 — Library: auto-add on open, manual remove

**As a** mobile user,  
**I want** every book I open to be added automatically to the Library section, and to be able to remove items from the Library manually if I choose,  
**so that** my Library reflects what I’ve opened and I can tidy it when I want.

### Acceptance Criteria

1. **Auto-add:** When the user opens a book (e.g., opens book detail or starts playback), that book is added to the Library section automatically; no separate “Add to Library” action is required for adding.
2. **Manual remove:** User can remove a book (or books) from the Library from the Library screen/settings; removal is manual only.
3. Re-opening a book that was removed from Library adds it to Library again (auto-add behavior is consistent).
4. Library list and any “recent” or “in progress” behavior remain consistent with existing app behavior where applicable.

---

## Story 8.5 — Settings: storage usage and mobile data usage

**As a** mobile user,  
**I want** the Settings page to show mobile data usage and storage usage (allocated vs used with percentage),  
**so that** I can see how much data and storage the app is using.

### Acceptance Criteria

1. **Mobile data usage:** Settings displays the app’s mobile data usage (e.g., total or period-based as per platform capabilities).
2. **Storage usage:** Settings displays storage used by the app: allocated (or total available for the app) and used, with a percentage (e.g., “X MB used of Y MB allocated (Z%)” or equivalent).
3. Display is clear and stays accurate after downloads, cleanup, or DB changes (Stories 8.2, 8.3).
4. No regression in existing Settings options (theme, cleanup, DB management, etc.).

---

## Compatibility and scope

- **Data:** Catalog comes only from local DB (SQLite or migrated type); no API calls for catalog. MP3 playback may still use network when not downloaded (streaming).
- **DB source:** New DBs are loaded from a public URL (e.g., GitHub); format and URL are documented; refresh does not overwrite existing DBs.
- **UI:** Categories section removed; Library and Settings gain the described behavior and metrics.
- **Order:** 8.1 (local DB + remove categories) is first; 8.2 (download/cleanup) and 8.3 (DB management) can follow or be parallel; 8.4 (Library) and 8.5 (Settings metrics) can be implemented in parallel once 8.1–8.3 scope is clear.

---

## Definition of Done

- [ ] Story 8.1: Catalog is loaded from local SQLite only; no catalog API calls; categories section removed; migration path for other DB type documented if applicable.
- [ ] Story 8.2: User can download MP3s for selected books, use app offline for those books, and clean all or selected book downloads from Settings.
- [ ] Story 8.3: User can load DB from internet, see list (size, date, active), refresh without overwriting, remove DBs, and see data reload when DB/active changes.
- [ ] Story 8.4: Opening a book adds it to Library; user can remove items from Library manually.
- [ ] Story 8.5: Settings shows mobile data usage and storage usage (allocated vs used with percentage).
- [ ] No regression in core flows: browse, search, book detail, playback, and existing Settings.
