# Grqaser Monorepo

This repository contains the current Grqaser platform:

- `GrqaserApp/` - the React Native mobile app for end users
- `books-admin-app/` - the admin application that manages catalog data, crawler workflows, and the local API/web UI

The root `README.md` is intentionally a repo guide only. App-specific setup, commands, and implementation details belong in each app's own README.

## What Lives Here

### Main applications

- `GrqaserApp/`
  Consumer mobile app. Uses a local SQLite catalog, supports playback, downloads, library management, and advanced search.
- `books-admin-app/`
  Admin app for crawler control, database management, editing catalog data, and serving the admin API/web UI.

### Shared project material

- `docs/`
  Source of truth for architecture, PRD, stories, runbooks, QA notes, setup guides, and design mockups.
- `data/`
  Shared SQLite data area. `data/grqaser.db` is treated in project docs as the canonical catalog database.
- `package.json`
  Root convenience scripts for running tests and launching each app.
- `jest.setup.js`
  Shared Jest setup referenced by the root test configuration.

### Tooling and workflow files

- `AGENTS.md`
  BMAD/Codex agent instructions for working in this repository.
- `.bmad-core/`
  BMAD method files used by the agent workflow.
- `.github/`
  Repository automation and CI configuration.
- `.gitignore`, `.npmrc`, `.nvmrc`
  Standard repo-level development configuration.

### Local or optional folders

- `node_modules/`
  Generated dependencies. Not part of the source and can be recreated with `npm install`.
- `backups/`
  Manual database backups. Useful operationally, but not required for the app code to build.
- `.cursor/`, `.vscode/`
  Editor-specific settings. Helpful locally, not required for runtime.
- `setup.sh`
  Legacy bootstrap script from the older single-app setup. Keep only if you still use it; it does not reflect the current two-app architecture.

## Quick Start

### Root scripts

```bash
npm install

# Mobile app
npm start
npm run android
npm run ios

# Admin app
npm run admin:start
npm run admin:dev

# Tests
npm test
npm run admin:test
```

Root scripts are convenience wrappers. For app-specific setup and troubleshooting, use the app readmes:

- [GrqaserApp README](./GrqaserApp/README.md)
- [books-admin-app README](./books-admin-app/README.md)

## Recommended Reading Order

If you are new to the repo, start here:

1. `docs/architecture/delivery-order-and-application-boundaries.md`
2. `docs/architecture/source-tree.md`
3. `docs/architecture/grqaserapp-data-integration-and-audio.md`
4. `docs/architecture/books-admin-app-architecture.md`
5. The README inside the app you want to work on

## Documentation Map

- `docs/architecture/`
  Technical architecture, boundaries, data flow, source tree, testing strategy.
- `docs/prd/`
  Product requirements by epic.
- `docs/stories/`
  Story-level implementation records.
- `docs/runbooks/`
  Operational guides for admin app and mobile distribution.
- `docs/design/`
  Shared design system and UI mockups for both applications.
- `docs/setup/`
  Environment setup notes for Android, iOS, and database setup.

## Root Folder Review

If your goal is to keep the root clean, this is the practical split:

- Keep:
  `GrqaserApp/`, `books-admin-app/`, `docs/`, `data/`, `package.json`, `package-lock.json`, `jest.setup.js`, `AGENTS.md`, `.github/`, `.gitignore`, `.npmrc`, `.nvmrc`
- Keep if you use BMAD/Codex workflows:
  `.bmad-core/`
- Safe to regenerate locally:
  `node_modules/`
- Optional local/editor files:
  `.cursor/`, `.vscode/`
- Optional operational history:
  `backups/`
- Likely outdated and worth reviewing for removal:
  `setup.sh`

## Notes

- Current architecture docs describe two active applications, not one.
- The mobile app no longer relies on the old API-only flow for catalog browsing; the newer docs describe local SQLite-based catalog access.
- Some older documents still reference pre-merge crawler/viewer paths. Prefer `docs/architecture/` and current runbooks when there is a conflict.
