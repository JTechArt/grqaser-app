# Grqaser Books Admin App

Admin application for the Grqaser platform.

This app is the single admin-side entrypoint in the repo. It provides the local web UI, REST API, crawler controls, database switching/versioning, and data editing tools used to manage the catalog.

## Main Responsibilities

- Serve the admin web UI
- Expose the local REST API
- Start and stop crawler runs
- Store and apply crawler configuration
- Read and edit catalog data
- Manage active and backup SQLite databases

## Run

```bash
cd books-admin-app
npm install
npm start
```

Development mode:

```bash
npm run dev
```

Default URL: `http://localhost:3001`

## Requirements

- Node.js 22+
- npm

## Configuration

Primary environment variables:

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | HTTP port | `3001` |
| `HOST` | Bind host | `localhost` |
| `DB_PATH` | Explicit database path override | `../data/grqaser.db` via app config |
| `DB_DATA_ROOT` | Root scanned for default/versioned databases | `../data` via app config |
| `CRAWLER_DB_PATH` | DB path used by crawler execution | current active DB |
| `LOG_LEVEL` | Log verbosity | `info` |
| `NODE_ENV` | Runtime environment | `development` |

Example:

```bash
PORT=3002 DB_PATH=/absolute/path/to/grqaser.db npm start
```

## API Overview

Main endpoints include:

- `GET /api/v1/books`
- `GET /api/v1/books/search`
- `GET /api/v1/books/:id`
- `PATCH /api/v1/books/:id`
- `GET /api/v1/stats/overview`
- `GET /api/v1/stats/authors`
- `GET /api/v1/stats/categories`
- `GET /api/v1/crawler/status`
- `POST /api/v1/crawler/start`
- `POST /api/v1/crawler/stop`
- `GET /api/v1/crawler/config`
- `PUT /api/v1/crawler/config`
- `GET /api/v1/crawler/urls`
- `GET /api/v1/crawler/logs`
- `GET /api/v1/databases`
- `PUT /api/v1/databases/active`
- `DELETE /api/v1/databases/:id`
- `GET /api/v1/health`

## Database Management

The app works with one active database at a time and can discover backup/versioned databases under the configured data root.

- Active DB is used for reads, edits, and crawler writes
- Backup/versioned DBs can be activated or removed
- Registry/config files are stored under the app data area

Project docs still treat `../data/grqaser.db` as the canonical shared catalog database for local workflows.

## Crawler Control

Crawler operations are managed through this app:

- Start and stop runs from the UI or API
- Persist crawler config between runs
- Inspect queue, logs, and health data
- Validate output through the same admin UI and API

For operational instructions, prefer the runbook:

- `../docs/runbooks/books-admin-app.md`

## Tests

```bash
cd books-admin-app
npm test
```

## Related Docs

- `../docs/architecture/books-admin-app-architecture.md`
- `../docs/architecture/source-tree.md`
- `../docs/architecture/testing-and-deployment-strategy.md`
- `./INTEGRATION.md`
- `./MIGRATION-QUICK-START.md`

## Notes

- This README is intentionally focused on local development and app responsibilities.
- Repo-wide guidance lives in `../README.md`.
- If older docs mention standalone crawler or database-viewer apps, prefer current architecture docs: this app is now the single admin entrypoint.
