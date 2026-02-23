# Performance Testing Plan (2000 Books)

## Purpose

Validate and improve GrqaserApp performance at scale using a 2000-book dataset. This plan defines metrics per feature, baseline capture, targets, and optimization work.

## Dataset: 2000 Books

### Obtaining the Test Database

1. **Generate using seed script** (recommended):
   ```bash
   cd books-admin-app && npm run seed:2000
   ```
   This creates `books-admin-app/data/grqaser-2000.db`. If you see a Node.js/better-sqlite3 version error, run `npm rebuild` in books-admin-app first.

2. **Load into GrqaserApp**:
   - **Android**: Copy `grqaser-2000.db` to `GrqaserApp/android/app/src/main/assets/` and rename to `grqaser.db` (or add as `grqaser-2000.db` and load via Settings).
   - **iOS**: Add `grqaser-2000.db` to the Xcode project (Copy Bundle Resources) or load via Settings.
   - **Via Settings**: If the app supports loading DBs from a URL or file picker, use that to load the 2000-book DB.

3. **Pre-bundled (default)**: For release builds, replace the default bundled `grqaser.db` in assets with `grqaser-2000.db` for performance testing.

---

## Features and Metrics

### 1. App Launch (Time to Interactive)

| Metric | Description | How to Measure |
|--------|-------------|----------------|
| Cold start | Time from tap to usable app shell | Stop app, start timer on tap, stop when Home content (stats, first books) renders. Use `adb logcat` / Xcode console for `AppRegistry` timestamps if instrumented. |
| Time to interactive | First paint + stats visible | Manual: time until Audiobooks/E-books counts appear; shell navigable. |
| Target | &lt; 2.5 s on mid-range device | |

**Instrumentation**: Optional `console.time('app-init')` / `console.timeEnd` in `App.tsx` and `HomeScreen` mount.

### 2. Search (Time to First Result, Scroll FPS)

| Metric | Description | How to Measure |
|--------|-------------|----------------|
| Time to first result | Submit search until first row visible | Manual: enter query (e.g. "book"), tap search, time until results appear. |
| Broad query | Search "a" or "the" (many results) | Should return quickly with limited results (e.g. first 100) rather than all matches. |
| Scroll FPS | FPS while scrolling search results | React DevTools Profiler, Flipper, or `adb shell dumpsys gfxinfo` / Xcode GPU frame capture. |
| Target | First result &lt; 500 ms; scroll ≥ 55 FPS | |

**Instrumentation**: `console.time('search')` in `searchBooks` thunk; React DevTools Profiler for render timing.

### 3. Library Load

| Metric | Description | How to Measure |
|--------|-------------|----------------|
| Library tab load | Time to show library entries | Focus Library tab, time until list renders. Uses `fetchBooksByIds` for visible entries. |
| Target | &lt; 800 ms | |

### 4. List Scroll (Home Featured, Library, Favorites, Search)

| Metric | Description | How to Measure |
|--------|-------------|----------------|
| Scroll FPS | FPS during rapid scroll through list | Same as Search scroll. |
| Jank | Dropped frames | React DevTools, Flipper. |
| Target | ≥ 55 FPS on mid-range; 60 FPS on high-end | |

**Optimizations**: FlatList with `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`; cover images lazy-loaded (Story 10.6).

### 5. Cover Image Load

| Metric | Description | How to Measure |
|--------|-------------|----------------|
| Time to first paint | First N covers visible | Time until first row of covers renders (placeholder or image). |
| Memory | Heap growth while scrolling | Xcode Memory Graph / Android Profiler. Should stay bounded with eviction (Story 10.6). |
| Target | First row &lt; 300 ms; memory bounded | |

---

## Baselines and Targets

| Feature | Baseline (record after first run) | Target |
|---------|-----------------------------------|--------|
| App launch (cold) | _TBD_ | &lt; 2.5 s |
| Search (first result) | _TBD_ | &lt; 500 ms |
| Library load | _TBD_ | &lt; 800 ms |
| List scroll FPS | _TBD_ | ≥ 55 FPS |
| Cover first paint | _TBD_ | &lt; 300 ms |

*Run baseline measurements with 2000-book DB and fill in the Baseline column. Document date and device.*

---

## Optimization Checklist (Story 10.5)

- [x] Search: Limit results (e.g. first 100) to avoid loading 2000 rows into memory
- [x] Search: Add indexes on `title`, `author` for faster LIKE queries (in seed DB)
- [x] FlatList: `initialNumToRender`, `maxToRenderPerBatch`, `windowSize` on Library, Favorites, Search
- [x] Launch: Confirmed lazy load from Story 10.1 (fetchBooksPage, fetchCatalogStats)
- [ ] Cover lazy load / cache: Story 10.6 (deferred)

---

## Results and Limits (Update After Testing)

### Optimizations Applied (Story 10.5)

1. **Search**: Results capped at 100 rows; avoids loading 1000+ rows for broad queries (e.g. "a").
2. **Search**: Seed DB includes indexes on `title` and `author` for faster LIKE queries.
3. **FlatList**: Added `initialNumToRender={12}`, `maxToRenderPerBatch={10}`, `windowSize={10}`, `removeClippedSubviews` on Library, Favorites, and Search screens.
4. **Launch**: Already optimized in Story 10.1 (lazy load, getStats for counts).
5. **Cover lazy load**: Deferred to Story 10.6.

### Before / After (Fill After Manual Testing)

| Metric | Before | After |
|--------|--------|-------|
| Search "a" (2000 books) | _TBD_ | Capped at 100 rows; measure time |
| Library scroll FPS | _TBD_ | _TBD_ |

### Known Limits

- Scroll FPS may drop on very old devices (document device model if observed).
- Broad search queries return capped results; user can refine query for more specific results.
- Cover re-load when returning to a list after eviction is expected (Story 10.6).

---

## References

- Story 10.1: App Launch Performance and Lazy Load
- Story 10.6: Book Cover Lazy Load and Memory Cleanup
- `docs/architecture/data-models-and-schema.md` — Books table schema
- `GrqaserApp/src/database/catalogRepository.ts` — Catalog reads
