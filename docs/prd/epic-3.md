# Epic 3: GrqaserApp foundation

**Phase 3 — start only after Epic 2 (database-viewer) is complete and crawler data has been validated.** GrqaserApp relies on the result of the first application (data crawler).

**Goal:** GrqaserApp is the main mobile app. This epic establishes the React Native project, navigation, state management, and data integration so users can browse the catalog and open book details using the crawler’s data.

---

## Story 3.1 — Project setup and structure

**As a** developer,  
**I want** the React Native project initialized with a clear structure (screens, navigation, state, services),  
**so that** feature work can proceed in a consistent way.

### Acceptance Criteria

1. React Native app runs on iOS and Android (emulator/simulator).
2. Folder structure includes screens, navigation, state, services, types, and shared constants.
3. TypeScript, ESLint, and Prettier are configured; path aliases work.

---

## Story 3.2 — Navigation and core screens

**As a** user,  
**I want** to move between Home, Search, Book detail, and Profile/Settings,  
**so that** I can discover books and manage preferences.

### Acceptance Criteria

1. Tab (or equivalent) navigation for main sections; stack for detail flows.
2. Placeholder or minimal implementations for Home, Search, Book detail, Profile/Settings.
3. Navigation types are defined and deep linking is considered for future use.

---

## Story 3.3 — State management and data integration

**As a** developer,  
**I want** state (books, search, user preferences) and data services to be wired to the crawler-backed API or data export,  
**so that** the UI shows real catalog data.

### Acceptance Criteria

1. State management (e.g., Redux Toolkit) is configured with slices for books, audio, user, search.
2. Data services load books (list, by id, search) from the database-viewer API or agreed data source.
3. Loading and error states are handled; data is displayed on Home and Search.

---

## Story 3.4 — Home and book detail UI

**As a** user,  
**I want** to see featured/categorized books on Home and full book information on a detail screen,  
**so that** I can choose what to listen to.

### Acceptance Criteria

1. Home shows catalog content (e.g., featured list and/or categories) from the integrated data.
2. Book detail shows metadata (title, author, description, duration, etc.) and is ready for “Play” integration.
3. Pull-to-refresh updates the list where applicable.
