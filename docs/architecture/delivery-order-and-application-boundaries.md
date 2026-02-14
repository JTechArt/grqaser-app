# Delivery order and application boundaries

**This section is mandatory for all workers (Architect, Dev, Scrum Master, PO, QA).** The three applications are cared for separately and delivered in strict order. Do not start the next phase until the current one is done and validated.

## Phase overview

| Phase | Application       | Rule |
|-------|-------------------|------|
| **1** | **Data crawler**  | Finalize first. Complete all crawler work (metadata, audio URLs, full catalog, cleaning, schema). Consider the crawler “done” only when data is complete, validated, and the schema is documented. |
| **2** | **Database-viewer** | Start only after Phase 1 is complete. Use the database-viewer to check that crawled data is correct and that the API and web UI work against the real database. Do not move to Phase 3 until the viewer has validated the crawler output. |
| **3** | **GrqaserApp (mobile)** | Start only after Phases 1 and 2 are complete. The mobile app relies on the result of the first application (crawler) and on the database-viewer (or data export) for its data. No mobile app development that depends on catalog/playback data should begin before the crawler is done and the viewer has confirmed data correctness. |

## Definition of “phase complete”

- **Phase 1 complete:** Crawler runs successfully, full catalog (or agreed target) is in the DB, schema is documented, and data quality is accepted (e.g., no missing required fields, audio URLs valid where expected).
- **Phase 2 complete:** Database-viewer is implemented and used to verify that crawled data is correct; books, stats, and crawler monitoring work; team agrees data is ready for the mobile app.
- **Phase 3 start:** Only after Phase 2 sign-off; GrqaserApp then consumes the crawler’s data (via database-viewer API or agreed export).

## Guidance for other workers

### Architect

- Design and document **each application separately**.
- Enforce the dependency: **crawler → database-viewer → GrqaserApp**.
- Do not design mobile data integration or APIs that assume crawler or viewer work is still in progress.
- Align milestones and architecture sections with the phase gates above.
- In architecture docs, **explicitly reference this delivery order** so Dev, SM, PO, and QA see it.

### Dev

- Implement **in phase order**.
- Do **not** start database-viewer stories until the crawler is finalized.
- Do **not** start GrqaserApp catalog/playback stories until the database-viewer has been used to validate crawler data.
- If assigned to a later phase, assume the previous phase is complete and use its outputs only.

### Scrum Master / PO

- Plan and sequence work so that **Epic 1 (crawler) is fully done before Epic 2 (database-viewer)**, and **Epic 2 is done and data validated before Epic 3 (GrqaserApp)**.
- Do not schedule stories that break this order.
- Acceptance for “Epic 1 done” includes “crawler data complete and schema documented”.
- Acceptance for “Epic 2 done” includes “crawler data verified via database-viewer”.

### QA

- Test **each application in phase order**.
- Validate crawler output and schema before signing off Phase 1.
- Use the database-viewer to verify data correctness before signing off Phase 2.
- Test the mobile app only against data that has passed Phase 2 validation.

## Data flow and dependency

```
Phase 1: Crawler (single source of truth)
    ↓
    SQLite (grqaser.db) — schema documented, data validated
    ↓
Phase 2: Database-viewer (read-only; verify data)
    ↓
    REST API + Web UI — used to confirm data correctness
    ↓
Phase 3: GrqaserApp (consumes crawler data via viewer API or export)
```

All three applications share one data contract (schema and types). The crawler is the only writer to the canonical store; the database-viewer and GrqaserApp are consumers.
