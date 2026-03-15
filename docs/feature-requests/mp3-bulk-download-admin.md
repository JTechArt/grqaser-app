# Feature Request: MP3 Bulk Download (Books Admin App)

## Summary

**Scope:** books-admin-app only  
**Branch:** `feature/download`  
**Type:** New feature — ability to download MP3 files for all books from the admin app to a user-selected folder, with metadata, storage limits, and multi-batch support.

---

## Background

The Grqaser catalog contains ~950 books, each with one or more MP3 files (single-file or multi-chapter). Total size may exceed available storage. Administrators need to:

- Download books to a chosen folder (e.g., for archival or distribution)
- Track what has been downloaded and where
- Respect storage limits (e.g., 200GB per batch)
- Run multiple download batches (e.g., Part 1, Part 2, … Part 10) and move each batch to external storage
- See real-time progress and history

---

## User Story

**As an** administrator using books-admin-app,  
**I want** to bulk-download MP3 files for books to a selected folder, with metadata, storage limits, and batch history,  
**so that** I can archive or distribute the full audiobook catalog in manageable batches and know exactly what was downloaded and where.

---

## Requirements

### 1. Folder Selection

- Admin selects the base folder where download data will be stored
- Path can be absolute or relative (depending on platform)
- Folder must be writable; app validates before starting

### 2. Database — Download Tracking

**New table: `admin_downloaded_books`**

Tracks which books have been downloaded and their location. Since the same book may have multiple parts (chapters), we need per-file or per-book granularity.

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| book_id | INTEGER | NOT NULL; references books.id |
| download_batch_id | TEXT | NOT NULL; e.g. `batch-{uuid}` or `part-1`, `part-2` |
| local_folder_path | TEXT | NOT NULL; full path where book was downloaded |
| total_size_bytes | INTEGER | Sum of all MP3 file sizes for this book |
| part_count | INTEGER | Number of MP3 parts (1 for single-file; chapter_count for multi-chapter) |
| parts_downloaded | INTEGER | Number of parts successfully downloaded |
| status | TEXT | `pending`, `in_progress`, `completed`, `failed`, `paused` |
| started_at | TIMESTAMP | When download for this book began |
| completed_at | TIMESTAMP | When download finished (NULL if failed/paused) |
| error_message | TEXT | NULL; set if failed |

**New table: `admin_download_batches`**

Tracks each download run (batch/part) for history and UI.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | PRIMARY KEY; e.g. `batch-{uuid}` or `part-1` |
| base_folder_path | TEXT | NOT NULL; folder selected for this batch |
| max_size_bytes | INTEGER | NOT NULL; e.g. 200 * 1024 * 1024 * 1024 (200GB) |
| status | TEXT | `preparing`, `downloading`, `paused`, `completed`, `cancelled` |
| books_downloaded | INTEGER | Count of books completed |
| total_size_bytes | INTEGER | Running sum of downloaded bytes |
| started_at | TIMESTAMP | When batch started |
| completed_at | TIMESTAMP | When batch finished or paused |
| duration_seconds | INTEGER | Computed or stored duration |
| config_json | TEXT | JSON: book IDs in scope, pipeline phase, etc. |

### 3. Output Folder Structure

For each book, create:

```
{base_folder}/
  {book_id}_slug/
    metadata.json          # Created first (see below)
    part_001.mp3           # Or chapter_001.mp3, etc.
    part_002.mp3
    ...
```

**`metadata.json`** must include:

- `id` — book ID
- `title` — book title
- `description` — book description
- `author` — author name
- `duration` — total duration (formatted)
- `duration_minutes` — numeric duration
- `grqaser_url` — URL on grqaser.org (if available)
- `cover_image_url` — cover image URL
- `main_audio_url` — for single-file books
- `chapter_urls` — array of all MP3 URLs (for multi-chapter)
- `chapter_count` — number of parts
- `category` — category name
- `language` — language code
- `published_at` — if available
- `download_links` — array of all URLs to download (derived from main_audio_url or chapter_urls)

### 4. Storage Limit and Auto-Pause

- Admin configures max size per batch (default: 200GB)
- Before adding a book to the current batch, check: `current_batch_size + book_estimated_size <= max_size`
- If adding the book would exceed the limit, **pause the batch automatically**
- Batch status becomes `paused`; UI shows reason (e.g., "Storage limit reached (200GB)")
- Admin can start a new batch (Part 2) in a new folder or same base folder with a subfolder

### 5. Download Pipeline (Ordered Phases)

The download process must run in three phases:

**Phase 1: Create Structure**

- Create base folder and any subfolder structure
- Validate write permissions
- No downloads yet

**Phase 2: Create Folders and Metadata**

- For each book in scope:
  - Create `{book_id}_slug/` folder
  - Write `metadata.json` with all required fields
- All metadata files written before any MP3 download starts
- Enables partial recovery: if download fails later, metadata is already present

**Phase 3: Download MP3 Files**

- For each book (in same order or by priority):
  - Download each part (from main_audio_url or chapter_urls)
  - Save as `part_001.mp3`, `part_002.mp3`, etc.
  - Update `admin_downloaded_books` with progress and size
  - Check storage limit before each book; pause if limit would be exceeded

### 6. UI Requirements — Critical

**Real-time updates are critical.** The UI must show:

- **Current step** — Phase 1 / Phase 2 / Phase 3
- **Phase 1:** "Creating folder structure…"
- **Phase 2:** "Writing metadata for book X of Y…" with book title
- **Phase 3:** "Downloading book X of Y — part Z of W" with progress bar
- **Running totals** — books completed, total size downloaded, elapsed time
- **Storage limit** — "X GB / 200 GB" with progress bar; warning when near limit
- **Pause reason** — when auto-paused, show: "Paused: storage limit reached"

Use Server-Sent Events (SSE), WebSockets, or frequent polling (e.g., every 1–2 seconds) so the UI does not feel stale.

### 7. Download Batch History

- List all download batches (Part 1, Part 2, … Part 10) in reverse chronological order
- Each batch shows:
  - Batch ID / Part number
  - Base folder path
  - Status (completed, paused, cancelled)
  - Books downloaded count
  - Total size (GB)
  - Duration
  - Started at / Completed at

**Batch detail view (expand or drill-down):**

- Full download history for that batch
- List of books: title, author, folder path, size, duration, status
- Where it was downloaded (path)
- How long it took
- Any errors (if failed books exist)

---

## Non-Functional Requirements

- **Resilience:** If a book download fails, log the error, mark that book as `failed`, and continue with the next book
- **Idempotency:** If the same book is in a future batch, app can skip it (optional) or re-download — configurable
- **Concurrency:** One active download batch at a time
- **Cancellation:** Admin can cancel a running batch; partial progress is retained (metadata + any completed MP3s)

---

## Out of Scope (for this feature)

- GrqaserApp changes (this is admin-app only)
- Streaming or playback in admin app
- Authentication or multi-user (admin app is local-only)
- Automatic retry of failed downloads (can be added later)

---

## Technical Notes

### Books Table Reference

From `docs/architecture/data-models-and-schema.md`:

- Single-file books: `main_audio_url`
- Multi-chapter books: `chapter_urls` (JSON array), `chapter_count`, `has_chapters`
- Other fields: `id`, `title`, `author`, `description`, `duration`, `duration_formatted`, `cover_image_url`, etc.

### Grqaser URL

Construct from `id` if base URL is known (e.g. `https://grqaser.org/book/{id}` or similar — verify from crawler/source).

### Estimated Book Size

Use `file_size` from books table if available; otherwise estimate from duration (e.g., ~1MB per minute for typical MP3) or fetch Content-Length header when starting download.

---

## Acceptance Criteria (Draft)

1. Admin can select a folder for download and configure max size (default 200GB).
2. New tables `admin_downloaded_books` and `admin_download_batches` exist and are used.
3. Pipeline runs in order: create structure → create folders + metadata → download MP3s.
4. Each book folder contains `metadata.json` (created first) and MP3 files.
5. When batch size approaches max, download auto-pauses.
6. UI shows real-time progress (phase, book, part, size, time) and updates frequently.
7. Batch history list shows all batches with summary (books, size, duration, path).
8. Batch detail shows full history: books downloaded, paths, sizes, duration, status.
9. Admin can cancel a running batch; partial progress is kept.
10. Failed book downloads are logged and do not stop the batch.

---

## Suggested Implementation Order

1. **Database migrations** — Create `admin_downloaded_books` and `admin_download_batches` tables.
2. **Backend service** — Download pipeline (phases 1–3), storage limit logic, progress reporting (SSE or polling endpoint).
3. **API endpoints** — Start batch, stop batch, get status, get batch history, get batch detail.
4. **UI — Download setup** — Folder picker, max size input, "Start download" button.
5. **UI — Active download** — Real-time progress (phase, book, part, size, time, storage used).
6. **UI — Batch history** — List of batches; drill-down to batch detail.

---

## References

- [Books-admin-app architecture](../architecture/books-admin-app-architecture.md)
- [Data models and schema](../architecture/data-models-and-schema.md)
- [Story 8.2 — MP3 download storage](../stories/8.2.mp3-download-storage-and-offline-playback-cleanup.md) (GrqaserApp — context only)
