# Books-admin-app integration approach

## Overview

**books-admin-app** merges the **crawler** and **database-viewer** into a single Node.js application. One process runs the Express server (API + web UI) and exposes the crawler as an in-process library.

## Integration model

- **Viewer/API:** Express server in the main process. Serves REST API (`/api/v1/books`, `/api/v1/stats`, `/api/v1/crawler/*`, `/api/v1/health`) and static web UI from `public/`.
- **Crawler:** Integrated as an **in-process library**. The app requires the crawler package (`file:../crawler`) and invokes `GrqaserCrawler` when a crawl is requested (e.g. API or CLI). Crawler runs in the same Node process; for long-running full crawls, consider running the crawler in a worker/subprocess in a future story.
- **Database:** Single SQLite DB path is configured in app config (and env `DB_PATH` / `CRAWLER_DB_PATH`). Viewer and crawler use the same path when the app runs the crawler. DB path selection and versioning are addressed in Story 6.2.

## Single process

- One `node src/server.js` (or `npm start` / `npm run dev`) starts the Express server.
- Crawler code is loaded in the same process; no authentication. Local-only use.

## Rollback

- `crawler/` and `database-viewer/` remain in the repo. Books-admin-app depends on crawler via `file:../crawler` and reuses viewer routes and UI by copy into `books-admin-app/src` and `books-admin-app/public/`. Original apps can still be run independently for rollback.
