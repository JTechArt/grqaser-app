# Epic 11: App Startup Performance Optimization

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

## Story 11.1: Defer Database Initialization

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
7. ✅ Error state shows retry CTA and Settings link; no silent failure (UX guidance in Epic 11 UX Considerations)

### Tasks (5)
- Move initializeDatabases to App.tsx
- Make initialization non-blocking
- Add splash/loading screen
- Update HomeScreen to check initialization state
- Defer data fetching

---

## Story 11.2: Optimize Network Checks

**As a** developer,  
**I want** to identify and optimize network-related operations during startup,  
**so that** network availability doesn't cause 30-second delays.

### Acceptance Criteria

1. ✅ All network operations during startup identified and documented
2. ✅ Timeouts added to prevent indefinite blocking
3. ✅ Non-critical network checks deferred until after UI renders
4. ✅ File system operations optimized (caching, lazy loading)
5. ✅ SQLite connections don't block on network checks

### Tasks (5)
- Audit network operations at startup
- Add timeout to RNFS operations
- Optimize database file checks
- Review SQLite connection timeout
- Defer network monitor initialization

---

## Story 11.3: Add Startup Performance Monitoring

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

## Implementation Order

### Phase 1: Quick Wins (Story 11.1) - 2 days
**Expected Result:** Startup time reduced from 30s to <5s

### Phase 2: Deep Optimization (Story 11.2) - 2 days
**Expected Result:** Startup time reduced to <3s

### Phase 3: Monitoring (Story 11.3) - 1 day
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

## Related Documentation

- [Epic 8: Local SQLite Catalog](./epic-8.md) - Database architecture
- [Epic 10: Library, Performance, Offline](./epic-10.md) - Lazy load catalog (Story 10.1) complements this epic
- [GrqaserApp Data Integration](../architecture/grqaserapp-data-integration-and-audio.md)
- [Performance Testing Plan](../performance-testing-plan.md)

---

**Epic Status:** Ready for Implementation
**Total Stories:** 3
**Total Tasks:** 15
**Estimated Effort:** 1 week (1 developer)
**Priority:** Critical (User Experience)
**Impact:** High - Directly affects user retention and app store ratings
