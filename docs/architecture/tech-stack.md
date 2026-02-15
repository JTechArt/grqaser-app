# Tech stack

Definitive technology selection per application. All development must use these choices; see [delivery order](./delivery-order-and-application-boundaries.md) for phase sequence.

## Application-specific stack

### Phase 1: Data crawler

| Category       | Technology | Version / notes | Purpose |
|----------------|------------|-----------------|---------|
| Runtime        | Node.js    | LTS (e.g. 18+)  | CLI crawler execution |
| Browser automation | Puppeteer | Latest stable    | Page load, listing/detail extraction |
| Database        | SQLite     | 3.x             | Canonical store (`grqaser.db`) |
| Config          | JS/JSON    | —               | `src/config/crawler-config.js`; merged with `environments[NODE_ENV]` |
| Logging         | Custom / file | —             | Optional file logging under `logs/`; all modes use crawl_logs |
| Lint            | ESLint     | —               | Project-aligned or minimal executable config (Story 1.6) |
| Testing         | Jest       | —               | Unit (parsing/normalization), integration (DB writes) |

### Phase 2: Database-viewer

| Category       | Technology | Version / notes | Purpose |
|----------------|------------|-----------------|---------|
| Runtime        | Node.js    | LTS             | Express server |
| Backend        | Express    | 4.x             | REST API and static web UI |
| Database access| SQLite     | Same DB as crawler | Read-only; path configurable |
| API style      | REST       | —               | `/api/v1/books`, `/api/v1/stats`, `/api/v1/crawler`, `/api/v1/health` |
| Frontend       | Vanilla JS / HTML/CSS | —      | Single-page admin UI in `public/` |
| Config         | Env + JS   | —               | Port, DB path, CORS, rate limit, logging |
| Testing        | Jest / Supertest or similar | — | API and optional UI tests |

### Phase 3: GrqaserApp (mobile)

| Category       | Technology | Version / notes | Purpose |
|----------------|------------|-----------------|---------|
| Framework      | React Native | Latest stable  | iOS and Android single codebase |
| Language       | TypeScript | —               | Type safety |
| State          | Redux Toolkit | —            | Books, audio, user, search |
| Navigation     | React Navigation | —           | Tabs + stack |
| Audio playback | react-native-track-player (or equivalent) | — | Streaming, background, lock-screen |
| Data source    | REST API   | —               | Database-viewer API or agreed export |
| Storage         | AsyncStorage / local | —           | Favorites, progress, theme |
| Testing        | Jest, React Native Testing Library | — | Unit/integration; E2E for critical flows |
| Lint/format    | ESLint, Prettier | —            | Per project config |

## Shared

- **Data contract:** Single SQLite schema and documented types; crawler writes, database-viewer and GrqaserApp read.
- **Monorepo:** Single repo with `crawler/`, `database-viewer/`, `GrqaserApp/`; shared types/schema can live in a shared folder or be documented in one place (e.g. [Data models and schema](./data-models-and-schema.md)).

## Constraints

- Crawler and database-viewer may run on the same machine or different; DB path and CORS must be configurable.
- GrqaserApp targets iOS and Android only; no web app in MVP.
- No phase 2 or 3 work that depends on crawler output should start before the relevant phase gate is met (see [delivery order](./delivery-order-and-application-boundaries.md)).
