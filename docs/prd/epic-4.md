# Epic 4: GrqaserApp audio and playback

Depends on Epic 3.

**Goal:** Users can stream audiobooks with a reliable player, background playback, and persisted progress; basic preferences (favorites, theme) improve experience.

---

## Story 4.1 — Core audio player

**As a** user,  
**I want** to play, pause, seek, and see progress and duration,  
**so that** I can listen to audiobooks with standard controls.

### Acceptance Criteria

1. Playback uses the audio URLs from the crawler-backed data.
2. Play/pause, seek, and progress/duration display work correctly.
3. Player UI (full-screen or mini) is clear and responsive.

---

## Story 4.2 — Background playback and controls

**As a** user,  
**I want** playback to continue in the background with lock-screen/notification controls,  
**so that** I can use other apps or lock the device while listening.

### Acceptance Criteria

1. Audio continues when the app is in the background; interruptions (e.g., calls) are handled.
2. Lock-screen (iOS) and notification (Android) controls work for play/pause and optionally seek.
3. Playback resumes appropriately after interruptions.

---

## Story 4.3 — Progress and preferences

**As a** user,  
**I want** my playback position and preferences (favorites, theme) to persist,  
**so that** I can resume and use the app my way across sessions.

### Acceptance Criteria

1. Playback position is saved and restored per book/session.
2. Favorites (or equivalent) can be toggled and persist.
3. Dark/light theme preference is supported and persisted.
