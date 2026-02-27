# Epic 10: App Startup Performance Optimization

**Goal:** Fix slow app startup when network is available (~30 seconds) by deferring network requests and database initialization until after the app UI renders. Improve perceived performance and user experience during app launch.

---

## Problem Statement

**Current Behavior:**
- App opens quickly when network is NOT available
- App takes ~30 seconds to open when network IS available
- User sees blank/frozen screen during startup
- Poor user experience and perceived performance

**Root Cause:**
- `HomeScreen` blocks on `initializeDatabases()` in `useEffect`
- Database initialization runs synchronously before UI renders
- Network-related operations (file checks, database connections) may timeout
- No loading feedback during initialization

**Impact:**
- Users may think app is frozen or crashed
- High abandonment rate during first launch
- Poor app store ratings due to slow startup

---

## Story 10.1: Defer Database Initialization

**As a** user,  
**I want** the app to open immediately and show UI,  
**so that** I don't have to wait 30 seconds staring at a blank screen.

### Acceptance Criteria

1. ✅ App UI renders within 1-2 seconds regardless of network state
2. ✅ Database initialization runs asynchronously after UI is visible
3. ✅ Loading state shown while databases initialize
4. ✅ User can see app structure immediately (navigation, header, etc.)
5. ✅ Data loads progressively as databases become available
6. ✅ Graceful error handling if initialization fails
7. ✅ Error state shows retry CTA and Settings link; no silent failure (UX guidance in Epic 10 UX Considerations)

### Current Flow (Blocking)

```
App Launch
  ↓
App.tsx renders
  ↓
NavigationContainer renders
  ↓
HomeScreen mounts
  ↓
useEffect runs → initializeDatabases() ← BLOCKS HERE (30s)
  ↓
  ├─ initAppMetaDb()
  ├─ fetchManagedDatabases()
  └─ initCatalogDb()
  ↓
fetchBooksPage()
  ↓
UI shows data
```

### New Flow (Non-Blocking)

```
App Launch
  ↓
App.tsx renders
  ↓
NavigationContainer renders ← RENDERS IMMEDIATELY
  ↓
HomeScreen shows loading state
  ↓
(In background) initializeDatabases()
  ↓
  ├─ initAppMetaDb()
  ├─ fetchManagedDatabases()
  └─ initCatalogDb()
  ↓
(In background) fetchBooksPage()
  ↓
UI updates with data
```

### Implementation Changes

**1. Move initialization to App.tsx**
```typescript
// App.tsx - AppContent component
useEffect(() => {
  // Fire and forget - don't block render
  dispatch(initializeDatabases());
}, [dispatch]);
```

**2. Update HomeScreen to be non-blocking**
```typescript
// HomeScreen.tsx
useEffect(() => {
  // Only fetch if already initialized
  if (dbInitialized) {
    dispatch(fetchBooksPage({limit: 20, offset: 0}));
    dispatch(fetchCatalogStats());
  }
  // If not initialized, show loading state
}, [dispatch, dbInitialized]);
```

**3. Add loading screen component**
```typescript
// components/AppLoadingScreen.tsx
const AppLoadingScreen = () => (
  <View style={styles.container}>
    <ActivityIndicator size="large" />
    <Text>Loading catalog...</Text>
  </View>
);
```

**UX Guidance — Loading & Error States (Story 10.1):** See *UX Considerations* section below for design system alignment, skeleton vs spinner, copy, and error recovery patterns.

### Tasks (5)
- Move initializeDatabases to App.tsx
- Make initialization non-blocking
- Add splash/loading screen
- Update HomeScreen to check initialization state
- Defer data fetching

---

## Story 10.2: Optimize Network Checks

**As a** developer,  
**I want** to identify and optimize network-related operations during startup,  
**so that** network availability doesn't cause 30-second delays.

### Acceptance Criteria

1. ✅ All network operations during startup identified and documented
2. ✅ Timeouts added to prevent indefinite blocking
3. ✅ Non-critical network checks deferred until after UI renders
4. ✅ File system operations optimized (caching, lazy loading)
5. ✅ SQLite connections don't block on network checks

### Potential Bottlenecks

**1. RNFS File Operations**
- `RNFS.exists()` - Check if database files exist
- `RNFS.stat()` - Get file size/metadata
- `RNFS.readDir()` - List database directory
- **Issue:** May timeout on slow network/storage

**2. SQLite Database Connections**
- `SQLite.openDatabase()` - Open database connection
- **Issue:** May wait for file system to respond

**3. Network Monitor**
- `startNetworkMonitor()` - Initialize NetInfo
- **Issue:** Currently disabled, but may cause delays if re-enabled

**4. Database Manager**
- `appMetaRepository.listDatabases()` - Query managed databases
- `appMetaRepository.getActiveDatabase()` - Get active DB
- **Issue:** Runs during initialization, blocks UI

### Tasks (5)
- Audit network operations at startup
- Add timeout to RNFS operations
- Optimize database file checks
- Review SQLite connection timeout
- Defer network monitor initialization

---

## Story 10.3: Add Startup Performance Monitoring

**As a** developer,  
**I want** to measure and monitor app startup performance,  
**so that** I can identify bottlenecks and track improvements.

### Acceptance Criteria

1. ✅ Performance timing utilities created
2. ✅ App initialization phases instrumented
3. ✅ Database operations instrumented
4. ✅ Startup metrics logged to console (dev) or analytics (prod)
5. ✅ Performance dashboard available in dev mode

### Tasks (5)
- Add performance timing utilities
- Instrument app initialization
- Instrument database operations
- Add startup metrics logging
- Create performance dashboard

---

---

## Implementation Order

### Phase 1: Quick Wins (Story 10.1) - 2 days
1. Move `initializeDatabases` to App.tsx
2. Make initialization non-blocking
3. Update HomeScreen to not wait for initialization
4. Add simple loading state
5. Test startup time improvement

**Expected Result:** Startup time reduced from 30s to <5s

### Phase 2: Deep Optimization (Story 10.2) - 2 days
1. Audit all network operations
2. Add timeouts to RNFS operations
3. Optimize file system checks
4. Defer network monitor
5. Test on various network conditions

**Expected Result:** Startup time reduced to <3s

### Phase 3: Monitoring (Story 10.3) - 1 day
1. Add performance timing utilities
2. Instrument key operations
3. Log metrics
4. Create dev dashboard (optional)

**Expected Result:** Visibility into performance bottlenecks

---

## Success Metrics

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Startup time (network available) | ~30s | <3s | 90% faster |
| Startup time (no network) | ~2s | <2s | No regression |
| Time to first render | ~30s | <2s | 93% faster |
| Time to interactive | ~30s | <3s | 90% faster |

---

## Code Examples

### Optimization 1: Non-Blocking Initialization

**Before (HomeScreen.tsx):**
```typescript
useEffect(() => {
  if (!dbInitialized) {
    // BLOCKS UI RENDER
    dispatch(initializeDatabases()).then(action => {
      if (action.meta.requestStatus === 'fulfilled') {
        dispatch(fetchBooksPage({limit: 20, offset: 0}));
        dispatch(fetchCatalogStats());
      }
    });
  }
}, [dispatch, dbInitialized]);
```

**After (App.tsx):**
```typescript
// App.tsx - Initialize once at app level
useEffect(() => {
  // Fire and forget - don't await
  dispatch(initializeDatabases());
}, [dispatch]);

// HomeScreen.tsx - React to initialization state
useEffect(() => {
  if (dbInitialized) {
    dispatch(fetchBooksPage({limit: 20, offset: 0}));
    dispatch(fetchCatalogStats());
  }
}, [dispatch, dbInitialized]);
```

### Optimization 2: Add Timeouts

**Create timeout utility:**
```typescript
// utils/timeout.ts
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}
```

**Use in database initialization:**
```typescript
// databaseSlice.ts
export const initializeDatabases = createAsyncThunk(
  'database/initialize',
  async (_, {dispatch, rejectWithValue}) => {
    try {
      // Add 5-second timeout to prevent indefinite blocking
      await withTimeout(
        initAppMetaDb(APP_META_DB),
        5000,
        'Database initialization timed out'
      );

      const managed = await withTimeout(
        dispatch(fetchManagedDatabases()).unwrap(),
        5000,
        'Failed to fetch managed databases'
      );

      if (managed.active) {
        await withTimeout(
          initCatalogDb(managed.active.filePath),
          5000,
          'Catalog database initialization timed out'
        );
      } else {
        try {
          await withTimeout(initBundledCatalogDb(), 3000);
        } catch {
          // Non-fatal - user can load DB from Settings
        }
      }

      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Database init failed';
      return rejectWithValue(msg);
    }
  },
);
```

### Optimization 3: Defer Network Monitor

**Before (App.tsx):**
```typescript
useEffect(() => {
  const stop = startNetworkMonitor(); // Runs immediately
  return stop;
}, []);
```

**After (App.tsx):**
```typescript
useEffect(() => {
  // Defer network monitor by 2 seconds
  const timerId = setTimeout(() => {
    const stop = startNetworkMonitor();
    return () => {
      clearTimeout(timerId);
      stop();
    };
  }, 2000);

  return () => clearTimeout(timerId);
}, []);
```

### UX Considerations (Epic 10)

**Design system:** Align with `docs/design/README.md` (slate + teal, Plus Jakarta Sans). Use theme colors for ActivityIndicator and text.

**Perceived performance:**
- **Time to first paint:** Show navigation shell (tab bar, header) within 1–2s so users see structure immediately.
- **Loading copy:** Use contextual copy—"Initializing catalog..." during DB init; "Loading books..." when fetching. Avoid generic "Loading...".
- **Skeleton vs spinner:** For content areas (e.g., book grid), prefer skeleton placeholders that mirror layout over spinners; reduces perceived wait.
- **Progressive reveal:** Show available UI first (navigation, empty sections); populate sections as data arrives; avoid one big "loading" block.
- **Error recovery:** If init fails: "Couldn't load catalog. [Retry]" button. Provide Settings link to manually add database. No silent failure.
- **Empty state:** If no books: "No books in catalog yet. Add a database in Settings." with clear CTA.

**Accessibility:** Loading text must be announced to screen readers; ActivityIndicator has `accessibilityLabel` (e.g., "Loading catalog").

### Optimization 4: Progressive Loading

**Add loading states:**
```typescript
// HomeScreen.tsx
const renderContent = () => {
  // Error state first: show retry when init fails
  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Couldn't load catalog.</Text>
        <Button title="Retry" onPress={() => dispatch(initializeDatabases())} />
        <Text style={styles.hintText}>Or add a database in Settings.</Text>
      </View>
    );
  }
  if (!dbInitialized) {
    return (
      <View style={styles.loadingContainer} accessibilityLabel="Initializing catalog">
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Initializing catalog...</Text>
      </View>
    );
  }
  if (loading) {
    return (
      <View style={styles.loadingContainer} accessibilityLabel="Loading books">
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading books...</Text>
      </View>
    );
  }
  return renderBooks();
};
```

---

## Performance Monitoring

### Timing Utility

```typescript
// utils/performanceMonitor.ts
class PerformanceMonitor {
  private marks = new Map<string, number>();
  private measures = new Map<string, number>();

  mark(name: string) {
    this.marks.set(name, Date.now());
    if (__DEV__) {
      console.log(`[Perf] Mark: ${name}`);
    }
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : Date.now();

    if (!start) {
      console.warn(`[Perf] Start mark "${startMark}" not found`);
      return 0;
    }

    const duration = (end || Date.now()) - start;
    this.measures.set(name, duration);

    if (__DEV__) {
      console.log(`[Perf] ${name}: ${duration}ms`);
    }

    return duration;
  }

  getMeasures(): Record<string, number> {
    return Object.fromEntries(this.measures);
  }

  reset() {
    this.marks.clear();
    this.measures.clear();
  }
}

export const perfMonitor = new PerformanceMonitor();
```

### Usage Example

```typescript
// App.tsx
const AppContent: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    perfMonitor.mark('app-mount');

    dispatch(initializeDatabases()).then(() => {
      perfMonitor.measure('Database Initialization', 'app-mount');
    });
  }, [dispatch]);

  return (
    <NavigationContainer
      onReady={() => {
        perfMonitor.mark('navigation-ready');
        perfMonitor.measure('Time to Navigation Ready', 'app-mount', 'navigation-ready');
      }}>
      {/* ... */}
    </NavigationContainer>
  );
};
```

---

## Testing Strategy

### Manual Testing Checklist

- [ ] Test on iOS device with WiFi enabled
- [ ] Test on iOS device with WiFi disabled
- [ ] Test on Android device with WiFi enabled
- [ ] Test on Android device with WiFi disabled
- [ ] Test on slow network (throttled to 3G)
- [ ] Test on low-end device (old iPhone/Android)
- [ ] Test with large database file (>10MB)
- [ ] Test with no database file (first launch)
- [ ] Test app backgrounding during initialization
- [ ] Test app kill during initialization

### Performance Benchmarks

**Measure on each test:**
1. Time from app icon tap to first UI visible
2. Time from app icon tap to data displayed
3. Time from app icon tap to fully interactive
4. Memory usage during startup
5. CPU usage during startup

**Record results in table:**
| Device | Network | TTFR | TTI | Memory | CPU |
|--------|---------|------|-----|--------|-----|
| iPhone 12 | WiFi | 1.2s | 2.8s | 45MB | 12% |
| iPhone 12 | No Network | 1.1s | 1.5s | 42MB | 10% |
| ... | ... | ... | ... | ... | ... |

---

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Race conditions with async init | Medium | Medium | Use Redux state to track initialization; add proper loading states |
| User interacts before data loads | Low | High | Disable interactions during loading; show clear loading feedback |
| Initialization fails silently | High | Low | Add comprehensive error handling; show error messages to user |
| Performance regression on slow devices | Medium | Low | Test on low-end devices; add performance monitoring |
| Breaking existing functionality | High | Low | Thorough testing; gradual rollout with feature flag |

---

## Rollout Plan

### Phase 1: Development (Week 1)
- Implement all three stories
- Test on development devices
- Measure performance improvements

### Phase 2: Internal Testing (Week 2)
- Deploy to internal testers
- Collect performance metrics
- Fix any issues found

### Phase 3: Beta Release (Week 3)
- Deploy to beta testers
- Monitor crash reports and performance
- Gather user feedback

### Phase 4: Production (Week 4)
- Gradual rollout (10% → 50% → 100%)
- Monitor metrics closely
- Rollback plan ready if issues arise

---

## Related Documentation

- [Epic 8: Local SQLite Catalog](./epic-8.md) - Database architecture
- [GrqaserApp Data Integration](../architecture/grqaserapp-data-integration-and-audio.md)
- [Performance Testing Plan](../performance-testing-plan.md)

---

**Epic Status:** Ready for Implementation
**Total Stories:** 3
**Total Tasks:** 15
**Estimated Effort:** 1 week (1 developer)
**Priority:** Critical (User Experience)
**Impact:** High - Directly affects user retention and app store ratings
