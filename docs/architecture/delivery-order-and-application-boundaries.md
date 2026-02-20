# Delivery order and application boundaries

**This section is mandatory for all workers (Architect, Dev, Scrum Master, PO, QA).** After **Epic 7**, the repo has **one admin application — books-admin-app** (crawler + database-viewer behavior); standalone crawler and database-viewer are **removed or archived** (Story 7.2). GrqaserApp (mobile) consumes the books-admin-app API. Phase order below still defines the logical dependency for verification and for any work done before Epic 7 completion.

## Phase overview (logical order; post–Epic 7 delivered via books-admin-app)

| Phase | Application       | Rule |
|-------|-------------------|------|
| **1** | **Crawler behavior** | Delivered via **books-admin-app**. Complete all crawler work (metadata, audio URLs, full catalog, cleaning, schema). “Crawler done” when data is complete, validated, and schema documented — verified through books-admin-app. |
| **2** | **Viewer/API behavior** | Delivered via **books-admin-app**. Use books-admin-app to check that crawled data is correct and that the API and web UI work. Do not move to Phase 3 until data has been validated via books-admin-app. |
| **3** | **GrqaserApp (mobile)** | Start only after Phases 1 and 2 are complete (via books-admin-app). GrqaserApp consumes crawler data via **books-admin-app API** (or agreed export). No catalog/playback work before crawler data is validated through books-admin-app. |

## Epic 7: Single admin app; legacy apps removed or archived

**Epic 7** makes **books-admin-app** the only admin entrypoint and removes or archives the standalone crawler and database-viewer:

- **Story 7.1:** Verify books-admin-app functional parity with Epic 1 (crawler) and Epic 2 (database-viewer) so removal is safe. Parity mapping and sign-off: [docs/parity-books-admin-app.md](../parity-books-admin-app.md).
- **Story 7.2:** Standalone **crawler** and **database-viewer** top-level directories are **removed or moved to an archive path**. Root package.json, CI, and all documentation reference **books-admin-app** only. GrqaserApp and other consumers point at books-admin-app; data contract unchanged.
- **Stories 7.3–7.5:** Design system and UI/UX — single design system (slate + teal, Plus Jakarta Sans), mockups in `docs/design/` (books-admin-app and GrqaserApp), implementation in both apps to match mockups.

After Epic 7, there are **two runnable applications**: **books-admin-app** (admin: crawler + viewer + DB versioning + data edit) and **GrqaserApp** (mobile). See [Books-admin-app architecture](./books-admin-app-architecture.md).

## Definition of “phase complete”

- **Phase 1 complete:** Crawler behavior (via books-admin-app) runs successfully, full catalog (or agreed target) is in the DB, schema is documented, and data quality is accepted.
- **Phase 2 complete:** books-admin-app viewer/API and web UI are implemented and used to verify crawled data; books, stats, and crawler monitoring work; team agrees data is ready for the mobile app.
- **Phase 3 start:** Only after Phase 2 sign-off; GrqaserApp then consumes data via **books-admin-app API** (or agreed export).

## Guidance for other workers

### Architect

- Design and document **books-admin-app** as the single admin application; crawler and database-viewer as **standalone apps** are deprecated (removed/archived per Epic 7.2).
- Enforce the dependency: **crawler behavior → viewer/API behavior → GrqaserApp**, delivered and verified via **books-admin-app** for admin.
- In architecture docs, **explicitly reference this delivery order** and that books-admin-app is the only admin entrypoint post–Epic 7.

### Dev

- Implement admin work in **books-admin-app** only (no new features in standalone crawler or database-viewer; those dirs are removed or archived).
- Implement **in phase order** for any work that touches crawler or viewer behavior.
- GrqaserApp consumes **books-admin-app API**; data contract and schema unchanged.

### Scrum Master / PO

- Plan and sequence so Epic 1/2 behavior is delivered and verified via books-admin-app; Epic 7.1 (parity) and 7.2 (removal) follow that verification.
- After Epic 7, runbooks and verification refer to **books-admin-app** only.

### QA

- Validate crawler and viewer behavior **via books-admin-app**. Test the mobile app against data validated through books-admin-app.

## Data flow and dependency (post–Epic 7; updated for Epic 8)

```
books-admin-app (crawler + viewer + DB versioning + data edit)
    ↓
    SQLite (active DB) — schema documented, data validated
    ↓
    REST API + Web UI — single admin entrypoint
    ↓
    DB file exported/hosted at public URL (e.g. GitHub)   ← Epic 8
    ↓
GrqaserApp (downloads DB file → reads catalog from local SQLite)   ← Epic 8
```

One data contract (schema and types). books-admin-app is the writer (crawler) and reader (viewer/API). **After Epic 8:** GrqaserApp downloads the DB file from a public URL and reads catalog data from **local SQLite** — no API calls for catalog. MP3 streaming still uses the network when files are not downloaded locally.

## References

- [Epic 7](../prd/epic-7.md) — Remove crawler and database-viewer; UI/UX for books-admin-app and GrqaserApp.
- [Epic 8](../prd/epic-8.md) — GrqaserApp local data, offline playback, DB management, settings.
- [Books-admin-app architecture](./books-admin-app-architecture.md) — Run model, DB versioning, crawler control, data management, design system and UI/UX (Epic 7).
- [GrqaserApp data integration and audio](./grqaserapp-data-integration-and-audio.md) — Local SQLite, offline playback, library, DB management (Epic 8).
