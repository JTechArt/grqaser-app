# Epic 1: Crawler pipeline and data contract

**Phase 1.** Must be fully done before any Epic 2 work.

**Goal:** The crawler is the single pipeline that updates the main project’s data. This epic delivers a reliable, complete crawl (metadata + audio URLs, categories, authors), normalized and validated output, and a documented data contract (schema) for the database-viewer and GrqaserApp.

---

## Story 1.1 — Complete and normalize book metadata and audio URLs

**As an** operator,  
**I want** the crawler to extract full book metadata and valid audio URLs for each book,  
**so that** the database-viewer and GrqaserApp have complete, playable catalog data.

### Acceptance Criteria

1. Duration is parsed into a structured format (e.g., hours, minutes, formatted string).
2. Audio URLs are extracted from book detail pages, validated, and stored.
3. Categories/genres, ratings, descriptions, and language are extracted and stored per book.
4. Output schema is documented and consistent (e.g., unique IDs, required fields).

---

## Story 1.2 — Full catalog and pagination

**As an** operator,  
**I want** the crawler to traverse all listing pages and book detail pages (pagination),  
**so that** the full catalog (target 950+ books) is present in the database.

### Acceptance Criteria

1. Listing and detail pagination are implemented with configurable rate limiting.
2. All target books are crawled; duplicates are detected and avoided.
3. Each book has a complete metadata set and audio URLs where available.
4. Crawler run progress and errors are loggable and (optionally) visible via database-viewer.

---

## Story 1.3 — Search and categories/authors

**As an** operator,  
**I want** the crawler to use site search and category/author structures where available,  
**so that** catalog and relationships (book–author, book–category) are complete and consistent.

### Acceptance Criteria

1. Search flow on the source site works; results are merged into the catalog without duplicates.
2. Categories and authors are extracted and linked to books.
3. Data relationships support filtering and stats in the database-viewer and GrqaserApp.

---

## Story 1.4 — Data cleaning, validation, and schema

**As a** developer,  
**I want** crawled data to be cleaned, validated, and written against a fixed schema,  
**so that** the database-viewer and GrqaserApp can consume it without ad-hoc fixes.

### Acceptance Criteria

1. Text fields are cleaned (no HTML, normalized encoding).
2. Required fields and types are validated before write; invalid rows are logged/skipped.
3. Schema (tables, columns, constraints) is documented and versioned.
4. Data is written to the project’s SQLite database in the agreed location/path.
