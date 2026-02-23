# Epic 10: Library, Performance, and Offline Experience

**Prerequisite:** GrqaserApp (Epics 3–4, 7–9) is in place with local SQLite catalog, Library, downloads, and Settings. This epic addresses performance bugs (slow app load, memory usage), Library and Favorites UX issues, full offline support, and systematic performance optimization at scale.

**Goal:** (1) Fix app launch performance: avoid loading all books and images into memory; use lazy load and get collection count from DB so the app opens quickly. (2) Fix Library section: correct section button sizing with 5+ books (padding/margin), make In Progress reliable, and improve Download section with percent-overlay for in-progress downloads. (3) Align Favorites section layout with the Search screen layout for consistency and better design. (4) Support full offline use: app opens without network; show a clear “connection failed” warning and ping every 10s to update state; when connection is restored, show that it is fixed and remove the notification. (5) Define a performance testing plan with 2000 books, update metrics per feature, and optimize. (6) Lazy-load book cover images and use smart memory cleanup so covers are not kept in memory unnecessarily.

---

## Story 10.1 — App launch performance and lazy load

**As a** mobile user,  
**I want** the application to open very quickly without loading all books and images into memory,  
**so that** I can start using the app without long waits and the app remains responsive.

### Acceptance Criteria

1. **Fast app open:** The app launches and becomes usable quickly; initial load does not wait for the full catalog or all images to load.
2. **Lazy load catalog:** Book list/catalog data is loaded lazily (e.g., paginated or on-demand), not all books loaded into memory at once.
3. **Collection size from DB:** Where the UI needs the count of books (e.g., collection size), the app uses a count query (e.g., `getCount`) from the database instead of loading all books and then computing the size.
4. **No full preload of images:** Initial launch does not preload all book cover images; images are loaded as needed (lazy load).
5. No regression in browse, search, Library, or playback once data is loaded.

---

## Story 10.2 — Library section: layout, In Progress, and download progress

**As a** mobile user,  
**I want** the Library section to have consistent layout and reliable behavior for all subsections (All, In Progress, Downloads),  
**so that** section buttons stay correctly sized, In Progress shows my opened books reliably, and I see download progress clearly.

### Acceptance Criteria

1. **Section button sizing:** When there are more than five books in Library, section buttons (e.g., All, In Progress, Downloads) do not become smaller; padding and margin are correct so the layout remains consistent at any book count.
2. **In Progress reliability:** The “In Progress” section reliably shows books the user has opened (e.g., opened yesterday or today); the list is consistent and not sometimes empty when it should show items.
3. **Download section with progress:** When a download is started, the book appears in the Download section with an overlay (or clear indicator) showing the download percentage (e.g., “45%”) until complete.
4. No regression in other Library behavior (e.g., removing items, opening books).

---

## Story 10.3 — Favorites section: align layout with Search

**As a** mobile user,  
**I want** the Favorites section to use the same layout as the Search results screen,  
**so that** the design is consistent and the Favorites view is as clear and usable as Search.

### Acceptance Criteria

1. **Layout alignment:** The Favorites section uses the same layout and visual structure as the Search screen (e.g., grid/list, spacing, card size, padding).
2. **Consistent UX:** Interaction patterns (tap to open book, empty state, etc.) align with Search where applicable.
3. No regression in Favorites functionality (add/remove favorite, open book).

---

## Story 10.4 — Offline support and connection status

**As a** mobile user,  
**I want** the application to work without internet when I have downloaded books, and to see clear connection status,  
**so that** I can open the app and listen offline, and I know when the connection has failed or been restored.

### Acceptance Criteria

1. **Open without network:** The app opens and is usable without an internet connection; network is not required to launch the app.
2. **Offline listening:** If the user has downloaded books, they can browse and play them when offline.
3. **Connection-failed warning:** When the device has no (or lost) connection, the app shows a clear warning that the network connection failed (e.g., banner or notification).
4. **Connection recovery:** The app pings (or checks) connection state periodically (e.g., every 10 seconds); when the connection is restored, the app shows that it is fixed and removes the “connection failed” notification.
5. No blocking of app usage when offline for already-downloaded content; only appropriate warnings and optional features (e.g., catalog refresh) may be disabled.

---

## Story 10.5 — Performance testing plan and optimization (2000 books)

**As a** product owner / developer,  
**I want** a performance testing plan using a catalog of 2000 books, with metrics per feature and targeted optimizations,  
**so that** we can validate and improve performance at scale and avoid regressions.

### Acceptance Criteria

1. **Testing plan:** A documented performance testing plan is created that uses a dataset of 2000 books (or equivalent load).
2. **Metrics per feature:** The plan defines or updates metrics for each relevant feature (e.g., app launch, search, Library load, list scroll, cover loading).
3. **Baseline and targets:** Baseline metrics are captured (or updated) and improvement targets are set where applicable.
4. **Optimization work:** Identified bottlenecks from the plan are addressed with code or configuration changes to meet targets where feasible.
5. Results and any remaining limits are documented for future reference.

---

## Story 10.6 — Book cover images: lazy load and memory cleanup

**As a** mobile user and as a platform,  
**I want** book cover images to load lazily and not be kept in memory indefinitely,  
**so that** the app stays responsive and does not run out of memory with large catalogs.

### Acceptance Criteria

1. **Lazy load covers:** Book cover images are loaded on demand (e.g., when visible or when entering a screen), not preloaded for the entire catalog.
2. **Memory cleanup:** The app uses a smart cleanup strategy (e.g., limit cached images, evict off-screen or least-recently-used covers) so that memory used for cover images is bounded and released when appropriate.
3. **No full catalog in memory:** Cover image data is not retained for all books in memory at once; only a reasonable subset is cached.
4. Scrolling and navigation remain smooth; covers may re-load when returning to a list if they were evicted, with acceptable UX (e.g., placeholder then load).

---

## Compatibility and scope

- **Performance:** App launch, list rendering, and cover loading are optimized; collection counts use DB count queries. Works with existing local SQLite catalog and Library.
- **Offline:** App opens without network; connection status is indicated and updated periodically; downloaded content remains playable offline.
- **UI:** Library and Favorites layout/behavior fixes are contained to those screens; Search layout is the reference for Favorites.
- **Order:** 10.1 (launch/lazy load) and 10.6 (cover lazy load/memory) support 10.5 (performance plan). 10.2 and 10.3 can be done in parallel. 10.4 (offline) can follow or run in parallel once scope is clear. 10.5 can start after 10.1/10.6 or in parallel with a testing plan first.

---

## Definition of Done

- [ ] Story 10.1: App opens quickly; catalog and collection size use lazy load and DB count; no full preload of books/images at launch.
- [ ] Story 10.2: Library section buttons sized correctly with 5+ books; In Progress reliable; Download section shows percent overlay for in-progress downloads.
- [ ] Story 10.3: Favorites section uses the same layout as Search.
- [ ] Story 10.4: App works offline when content is downloaded; connection-failed warning and 10s ping; notification removed when connection restored.
- [ ] Story 10.5: Performance testing plan with 2000 books; metrics per feature; baselines/targets; optimizations applied and documented.
- [ ] Story 10.6: Cover images lazy-loaded and memory cleaned up with a bounded cache; no full catalog of covers in memory.
- [ ] No regression in core flows: browse, search, Library, Favorites, playback, Settings.
