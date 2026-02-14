# GrqaserApp data integration and audio

**Phase 3 application.** Start only after Phases 1 and 2 are complete and crawler data has been validated via the database-viewer. GrqaserApp relies on the result of the first application (crawler). See [delivery order and application boundaries](./delivery-order-and-application-boundaries.md).

## Role and boundaries

- **Responsibility:** Consumer-facing mobile app. Browse catalog, search, view book details, stream audiobooks with play/pause, seek, progress, background playback, lock-screen/notification controls; user preferences (favorites, playback position, dark/light theme).
- **Does not:** Replace or duplicate the crawler or database-viewer. Does not write to the canonical SQLite DB.
- **Input:** Data from crawler via database-viewer API or agreed export. No GrqaserApp catalog/playback development that depends on crawler data until Phase 2 has confirmed data correctness.

## Data integration

- **Source:** Database-viewer REST API (books list, by id, search; stats if needed) or agreed data export for offline/dev.
- **State:** Redux Toolkit (or equivalent) with slices for books, audio, user, search. Data services call API; loading and error states handled; data shown on Home and Search.
- **Types:** Align with [Data models and schema](./data-models-and-schema.md). Audio URLs come from crawler-backed data (same schema).

## Audio stack

- **Playback:** Library such as react-native-track-player. Use audio URLs from crawler-backed data. Play/pause, seek, progress and duration display. Background playback; lock-screen (iOS) and notification (Android) controls; handle interruptions (e.g. calls) and resume.
- **Progress and preferences:** Persist playback position per book/session; favorites toggle and persist; dark/light theme preference persisted (e.g. AsyncStorage or equivalent).

## UX and navigation

- **Navigation:** Tab (or equivalent) for main sections; stack for detail flows. Home, Search, Book detail, Profile/Settings. Deep linking considered for future.
- **Screens:** Home (featured/categories), Search, Book detail (metadata, ready for Play), full-screen and/or mini player, Profile/Settings (preferences, theme). Pull-to-refresh where applicable.
- **NFRs:** Network and playback errors surfaced to user; target iOS and Android with single codebase (React Native).

## Project structure (GrqaserApp)

- **Entry:** React Native app entry (e.g. `index.js`, `App.tsx`). **Structure:** screens, navigation, state, services, types, shared constants. TypeScript, ESLint, Prettier, path aliases as configured.

## References

- Epic 3 (GrqaserApp foundation), Epic 4 (Audio and playback). PRD FR8–FR13, NFR3–NFR5.
- [Data models and schema](./data-models-and-schema.md) — Types and schema for API responses.
- [Tech stack](./tech-stack.md) — GrqaserApp row.
- [Testing and deployment strategy](./testing-and-deployment-strategy.md) — App tests and builds.
