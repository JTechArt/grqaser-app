# Tech stack

Definitive technology selection per application. **After Epic 7:** the only admin app is **books-admin-app**; standalone crawler and database-viewer are removed or archived. See [delivery order](./delivery-order-and-application-boundaries.md).

## Application-specific stack

### Phase 1 & 2 (delivered via books-admin-app)

Crawler and database-viewer behavior are implemented inside **books-admin-app**; standalone Phase 1 and Phase 2 apps are removed or archived (Epic 7.2). Technology for that behavior is as in the books-admin-app row below.

### Books-admin-app (single admin app — Epic 6–7)

| Category       | Technology | Version / notes | Purpose |
|----------------|------------|-----------------|---------|
| Runtime        | Node.js    | LTS             | Single process: Express + crawler (library or subprocess) |
| Backend        | Express    | 4.x             | REST API, static web UI, crawler control, DB versioning, data edit |
| Browser automation | Puppeteer | Latest stable    | Crawler (same as Phase 1) |
| Database       | SQLite     | 3.x             | Active/backup DB versioning; read + write (crawler + manual edits) |
| API style      | REST       | —               | Same as database-viewer + extensions for DBs, crawler start/stop/config, PATCH books |
| Frontend       | Vanilla JS / HTML/CSS | —  | Admin UI: dashboard, books, crawler, DB versioning, edit forms; follow `docs/design/` (Epic 7) |
| Design system  | docs/design/README.md | —  | Slate + teal, Plus Jakarta Sans; mockups in `docs/design/books-admin-app/` (Stories 7.3–7.4) |
| Config         | Env + JS   | —               | Port, active DB path, crawler config (mode, rate limits, etc.) |
| Testing        | Jest / Supertest or similar | — | API and integration tests for merged app |

### GrqaserApp (mobile — Phase 3; updated for Epic 8)

| Category       | Technology | Version / notes | Purpose |
|----------------|------------|-----------------|---------|
| Framework      | React Native | Latest stable  | iOS and Android single codebase |
| Language       | TypeScript | —               | Type safety |
| State          | Redux Toolkit | —            | Books, audio, user, search, downloads, databaseManagement, library |
| Navigation     | React Navigation | —           | Tabs + stack |
| Audio playback | react-native-track-player (or equivalent) | — | Streaming and offline playback, background, lock-screen |
| Local database | react-native-sqlite-storage (or expo-sqlite) | — | **(Epic 8)** Read catalog from local SQLite; manage multiple DB files |
| File system    | react-native-fs (or expo-file-system) | — | **(Epic 8)** MP3 download storage, DB file management, storage metrics |
| Data source    | Local SQLite | —               | **(Epic 8)** Catalog loaded from local DB; no API calls for catalog data |
| Storage        | AsyncStorage / local | —           | Favorites, progress, theme, app metadata DB |
| Networking     | fetch / axios | —              | **(Epic 8)** Download DB files from public URL; stream MP3s when not downloaded |
| Testing        | Jest, React Native Testing Library | — | Unit/integration; E2E for critical flows; offline scenario tests |
| Lint/format    | ESLint, Prettier | —            | Per project config |

## Shared

- **Data contract:** Single SQLite schema and documented types; books-admin-app (crawler) writes and (viewer) serves API. **After Epic 8:** GrqaserApp reads catalog from a **local copy of the SQLite database** (not the API). The books table schema is identical; the DB file is exported/hosted for GrqaserApp to download.
- **Monorepo (post–Epic 7):** `books-admin-app/`, `GrqaserApp/`, `docs/design/`; crawler and database-viewer as standalone dirs are removed or archived. Shared types/schema: [Data models and schema](./data-models-and-schema.md).
- **Design system (Epic 7):** Colors (slate + teal), typography (Plus Jakarta Sans); documented in `docs/design/README.md`; mockups in `docs/design/books-admin-app/` and `docs/design/grqaser-app/`. Both books-admin-app and GrqaserApp UIs follow this system.

## Constraints

- books-admin-app is the single admin entrypoint; DB path and CORS configurable there.
- GrqaserApp targets iOS and Android only; no web app in MVP.
- **(Epic 8)** GrqaserApp does **not** call the books-admin-app API for catalog data; it reads from a local SQLite database. MP3 streaming still uses the network when files are not downloaded locally.
- No Phase 3 work that depends on crawler output should start before Phase 1/2 are verified via books-admin-app (see [delivery order](./delivery-order-and-application-boundaries.md)).
