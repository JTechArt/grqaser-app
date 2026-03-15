# GrqaserApp

React Native mobile app for the Grqaser platform.

The app is the end-user client in this repo. It uses a local SQLite catalog, supports online and offline playback, downloads MP3 files for offline listening, and includes advanced search, favorites, library management, and startup performance improvements.

## Main Responsibilities

- Browse and search the audiobook catalog from a local SQLite database
- Play audio in the foreground and background
- Download book audio for offline playback
- Manage local library, favorites, and playback progress
- Allow database refresh/switch flows on device

## Current Architecture

- Catalog data is read from local SQLite, not from a live catalog API
- `books-admin-app` is the admin-side producer and manager of catalog data
- Shared architecture and design docs live in `../docs/architecture/` and `../docs/design/`

Recommended docs:

- `../docs/architecture/grqaserapp-data-integration-and-audio.md`
- `../docs/architecture/source-tree.md`
- `../docs/architecture/testing-and-deployment-strategy.md`
- `../docs/runbooks/grqaserapp-distribution.md`

## Tech Stack

- React Native 0.72
- TypeScript
- Redux Toolkit
- React Navigation
- `react-native-track-player`
- `react-native-sqlite-storage`
- Jest + ESLint

## Getting Started

### Requirements

- Node.js 22+
- npm
- Android Studio for Android development
- Xcode for iOS development on macOS

### Install

```bash
cd GrqaserApp
npm install
```

### Run

```bash
# Metro
npm start

# Android
npm run android

# iOS
npm run ios
```

Useful scripts:

```bash
npm run start:reset
npm run lint
npm run type-check
npm test
```

## Project Structure

```text
GrqaserApp/
├── src/
│   ├── components/    # Shared UI pieces
│   ├── database/      # SQLite connection and repositories
│   ├── navigation/    # App navigation and deep linking
│   ├── screens/       # Home, Search, Advanced Search, Library, Player, Settings, etc.
│   ├── services/      # Playback, downloads, database management, storage, network helpers
│   ├── state/         # State modules
│   ├── store/         # Redux store
│   ├── theme/         # Theme tokens and helpers
│   ├── types/         # Shared app types
│   └── utils/         # Formatting, transliteration, performance helpers
├── __tests__/         # Component, screen, database, service, and integration tests
├── android/
├── ios/
└── package.json
```

## Testing

```bash
cd GrqaserApp
npm test
```

The root repo also provides a convenience command:

```bash
cd ..
npm test
```

## Notes

- This README is intentionally app-focused. Repo-wide guidance lives in `../README.md`.
- Some older documents in the repo still describe category browsing or API-first catalog access; prefer the architecture docs listed above when there is a mismatch.
