# Grqaser Architecture Document

This document is the single source of truth for the Grqaser ecosystem: **data crawler**, **database-viewer**, and **GrqaserApp** (mobile). It aligns with [docs/prd.md](../prd.md) and defines the technical architecture for AI-driven development.

## Critical: Read This First

**The three applications must be cared for separately and delivered in strict order.** All workers (Architect, Dev, Scrum Master, PO, QA) must follow the phase gates. See:

- **[Delivery order and application boundaries](./delivery-order-and-application-boundaries.md)** — **Mandatory reading.** Defines Phase 1 → Phase 2 → Phase 3 and explicit rules for each role.

## Sections

- [Delivery order and application boundaries](./delivery-order-and-application-boundaries.md) — Phase gates and rules for all workers
- [Tech stack](./tech-stack.md) — Technologies and versions per application
- [Source tree (unified project structure)](./source-tree.md) — Monorepo layout and boundaries
- [Crawler pipeline and data contract](./crawler-pipeline-and-data-contract.md) — Phase 1: crawler, SQLite schema, data flow
- [Database-viewer API and deployment](./database-viewer-api-and-deployment.md) — Phase 2: admin panel API and web UI
- [GrqaserApp data integration and audio](./grqaserapp-data-integration-and-audio.md) — Phase 3: mobile app, API consumption, playback
- [Data models and schema](./data-models-and-schema.md) — Shared data contract and SQLite schema
- [Testing and deployment strategy](./testing-and-deployment-strategy.md) — Tests and runbooks per application
- [Coding standards](./coding-standards.md) — Rules for dev agents and consistency

## Change log

| Date       | Version | Description                    | Author     |
|-----------|---------|--------------------------------|------------|
| 2025-02-14 | 1.0     | Initial architecture from PRD  | Architect  |
