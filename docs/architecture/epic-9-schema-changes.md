# Epic 9: Database Schema Changes

This document details the database schema changes for Epic 9: Advanced Book Search and Data Normalization.

---

## Current Schema (Before Epic 9)

```
┌─────────────────────────────────────────┐
│              books                      │
├─────────────────────────────────────────┤
│ id                INTEGER PRIMARY KEY   │
│ title             VARCHAR(500)          │
│ author            VARCHAR(200)          │  ← String field (denormalized)
│ description       TEXT                  │
│ duration          INTEGER               │  ← In minutes
│ duration_formatted TEXT                 │
│ type              VARCHAR(50)           │
│ language          VARCHAR(10)           │
│ category          VARCHAR(100)          │  ← String field (denormalized)
│ rating            DECIMAL(3,2)          │
│ rating_count      INTEGER               │
│ cover_image_url   TEXT                  │
│ main_audio_url    TEXT                  │
│ download_url      TEXT                  │
│ file_size         INTEGER               │
│ published_at      DATE                  │
│ created_at        TIMESTAMP             │
│ updated_at        TIMESTAMP             │
│ is_active         BOOLEAN               │
│ crawl_status      VARCHAR(50)           │
│ has_chapters      BOOLEAN               │
│ chapter_count     INTEGER               │
│ chapter_urls      TEXT                  │
│ last_edited_at    TIMESTAMP             │
└─────────────────────────────────────────┘
```

**Problems:**
- ❌ Duplicate author names (e.g., "John Smith", "john smith", "John  Smith")
- ❌ Duplicate category names
- ❌ No way to list unique authors/categories efficiently
- ❌ Difficult to filter by multiple authors/categories
- ❌ Data inconsistency

---

## New Schema (After Epic 9)

```
┌─────────────────────────────┐
│         authors             │
├─────────────────────────────┤
│ id          INTEGER PK      │
│ name        VARCHAR(200)    │  ← UNIQUE, NOT NULL
│ created_at  TIMESTAMP       │
│ updated_at  TIMESTAMP       │
└─────────────────────────────┘
         ▲
         │
         │ (1:N relationship)
         │
┌────────┴────────────────────────────────┐
│              books                      │
├─────────────────────────────────────────┤
│ id                INTEGER PRIMARY KEY   │
│ title             VARCHAR(500)          │
│ author            VARCHAR(200)          │  ← Keep temporarily
│ author_id         INTEGER FK            │  ← NEW: References authors(id)
│ description       TEXT                  │
│ duration          INTEGER               │
│ duration_formatted TEXT                 │
│ type              VARCHAR(50)           │
│ language          VARCHAR(10)           │
│ category          VARCHAR(100)          │  ← Keep temporarily
│ category_id       INTEGER FK            │  ← NEW: References book_categories(id)
│ rating            DECIMAL(3,2)          │
│ rating_count      INTEGER               │
│ cover_image_url   TEXT                  │
│ main_audio_url    TEXT                  │
│ download_url      TEXT                  │
│ file_size         INTEGER               │
│ published_at      DATE                  │
│ created_at        TIMESTAMP             │
│ updated_at        TIMESTAMP             │
│ is_active         BOOLEAN               │
│ crawl_status      VARCHAR(50)           │
│ has_chapters      BOOLEAN               │
│ chapter_count     INTEGER               │
│ chapter_urls      TEXT                  │
│ last_edited_at    TIMESTAMP             │
└─────────┬───────────────────────────────┘
          │
          │ (N:1 relationship)
          │
          ▼
┌─────────────────────────────┐
│    book_categories          │
├─────────────────────────────┤
│ id          INTEGER PK      │
│ name        VARCHAR(100)    │  ← UNIQUE, NOT NULL
│ created_at  TIMESTAMP       │
│ updated_at  TIMESTAMP       │
└─────────────────────────────┘
```

**Benefits:**
- ✅ Unique authors and categories
- ✅ Efficient filtering and searching
- ✅ Data consistency
- ✅ Easy to list all authors/categories
- ✅ Support for multi-select filters

---

## SQL Migration Script

### Step 1: Create New Tables

```sql
-- Authors table
CREATE TABLE IF NOT EXISTS authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(200) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Book categories table
CREATE TABLE IF NOT EXISTS book_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Step 2: Add Foreign Key Columns

```sql
-- Add foreign key columns to books table
ALTER TABLE books ADD COLUMN author_id INTEGER REFERENCES authors(id);
ALTER TABLE books ADD COLUMN category_id INTEGER REFERENCES book_categories(id);
```

### Step 3: Populate New Tables

```sql
-- Extract unique authors (normalized: trimmed, no duplicates)
INSERT INTO authors (name)
SELECT DISTINCT TRIM(author) as author_name
FROM books
WHERE author IS NOT NULL 
  AND TRIM(author) != ''
  AND TRIM(author) != 'Unknown Author'
ORDER BY author_name;

-- Extract unique categories (normalized: trimmed, no duplicates)
INSERT INTO book_categories (name)
SELECT DISTINCT TRIM(category) as category_name
FROM books
WHERE category IS NOT NULL 
  AND TRIM(category) != ''
  AND TRIM(category) != 'Unknown'
ORDER BY category_name;
```

### Step 4: Update Foreign Keys

```sql
-- Update books.author_id
UPDATE books
SET author_id = (
  SELECT id FROM authors 
  WHERE authors.name = TRIM(books.author)
)
WHERE author IS NOT NULL 
  AND TRIM(author) != ''
  AND TRIM(author) != 'Unknown Author';

-- Update books.category_id
UPDATE books
SET category_id = (
  SELECT id FROM book_categories 
  WHERE book_categories.name = TRIM(books.category)
)
WHERE category IS NOT NULL 
  AND TRIM(category) != ''
  AND TRIM(category) != 'Unknown';
```

### Step 5: Create Indexes

```sql
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_books_author_id ON books(author_id);
CREATE INDEX IF NOT EXISTS idx_books_category_id ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_duration ON books(duration);
CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(name);
CREATE INDEX IF NOT EXISTS idx_categories_name ON book_categories(name);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_books_author_category ON books(author_id, category_id);
```

---

## Advanced Search Query Examples

### Example 1: Multi-Author Filter

```sql
-- Find books by multiple authors
SELECT b.*, a.name as author_name, c.name as category_name
FROM books b
LEFT JOIN authors a ON b.author_id = a.id
LEFT JOIN book_categories c ON b.category_id = c.id
WHERE b.author_id IN (1, 2, 3)  -- Multiple author IDs
ORDER BY b.title;
```

### Example 2: Multi-Category Filter

```sql
-- Find books in multiple categories
SELECT b.*, a.name as author_name, c.name as category_name
FROM books b
LEFT JOIN authors a ON b.author_id = a.id
LEFT JOIN book_categories c ON b.category_id = c.id
WHERE b.category_id IN (5, 7, 9)  -- Multiple category IDs
ORDER BY b.title;
```

### Example 3: Duration Filter

```sql
-- Find books in duration range (1-2 hours = 60-120 minutes)
SELECT b.*, a.name as author_name, c.name as category_name
FROM books b
LEFT JOIN authors a ON b.author_id = a.id
LEFT JOIN book_categories c ON b.category_id = c.id
WHERE b.duration >= 60 AND b.duration < 120
ORDER BY b.title;
```

### Example 4: Combined Filters (AND Logic)

```sql
-- Advanced search with all filters
SELECT b.*, a.name as author_name, c.name as category_name
FROM books b
LEFT JOIN authors a ON b.author_id = a.id
LEFT JOIN book_categories c ON b.category_id = c.id
WHERE 
  -- Author filter (multi-select)
  (b.author_id IN (1, 2, 3) OR :author_ids IS NULL)
  
  -- Category filter (multi-select)
  AND (b.category_id IN (5, 7) OR :category_ids IS NULL)
  
  -- Duration filter (single-select)
  AND (
    (:duration_range = '<30' AND b.duration < 30) OR
    (:duration_range = '30-60' AND b.duration >= 30 AND b.duration < 60) OR
    (:duration_range = '60-120' AND b.duration >= 60 AND b.duration < 120) OR
    (:duration_range = '120-300' AND b.duration >= 120 AND b.duration < 300) OR
    (:duration_range = '300+' AND b.duration >= 300) OR
    :duration_range IS NULL
  )
  
  -- Text search (LIKE pattern)
  AND (
    b.title LIKE :search_pattern OR
    b.description LIKE :search_pattern OR
    a.name LIKE :search_pattern OR
    :search_text IS NULL
  )
  
ORDER BY b.title
LIMIT :limit OFFSET :offset;
```

---

## Data Integrity Checks

### Before Migration

```sql
-- Count total books
SELECT COUNT(*) as total_books FROM books;

-- Count books with authors
SELECT COUNT(*) as books_with_author 
FROM books 
WHERE author IS NOT NULL AND TRIM(author) != '';

-- Count books with categories
SELECT COUNT(*) as books_with_category 
FROM books 
WHERE category IS NOT NULL AND TRIM(category) != '';

-- Count unique authors
SELECT COUNT(DISTINCT TRIM(author)) as unique_authors 
FROM books 
WHERE author IS NOT NULL AND TRIM(author) != '';

-- Count unique categories
SELECT COUNT(DISTINCT TRIM(category)) as unique_categories 
FROM books 
WHERE category IS NOT NULL AND TRIM(category) != '';
```

### After Migration

```sql
-- Verify authors table
SELECT COUNT(*) as total_authors FROM authors;

-- Verify categories table
SELECT COUNT(*) as total_categories FROM book_categories;

-- Verify foreign keys populated
SELECT COUNT(*) as books_with_author_id 
FROM books 
WHERE author_id IS NOT NULL;

SELECT COUNT(*) as books_with_category_id 
FROM books 
WHERE category_id IS NOT NULL;

-- Check for orphaned books (should match books without original author/category)
SELECT COUNT(*) as orphaned_books 
FROM books 
WHERE author_id IS NULL 
  AND (author IS NOT NULL AND TRIM(author) != '');
```

---

## Rollback Plan

If migration fails or issues are discovered:

```sql
-- Step 1: Remove foreign key columns
ALTER TABLE books DROP COLUMN author_id;
ALTER TABLE books DROP COLUMN category_id;

-- Step 2: Drop new tables
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS book_categories;

-- Step 3: Drop indexes
DROP INDEX IF EXISTS idx_books_author_id;
DROP INDEX IF EXISTS idx_books_category_id;
DROP INDEX IF EXISTS idx_books_duration;
DROP INDEX IF EXISTS idx_authors_name;
DROP INDEX IF EXISTS idx_categories_name;
DROP INDEX IF EXISTS idx_books_author_category;
```

**Note:** Original `author` and `category` columns remain intact during migration, so data is not lost.

---

## Performance Considerations

### Query Performance

**Before (denormalized):**
```sql
-- Slow: Full table scan with LIKE
SELECT * FROM books WHERE author LIKE '%John Smith%';
```

**After (normalized):**
```sql
-- Fast: Index lookup
SELECT b.* FROM books b
WHERE b.author_id IN (
  SELECT id FROM authors WHERE name = 'John Smith'
);
```

### Index Usage

- `idx_books_author_id` - Used for author filtering
- `idx_books_category_id` - Used for category filtering
- `idx_books_duration` - Used for duration filtering
- `idx_authors_name` - Used for author search/autocomplete
- `idx_categories_name` - Used for category search/autocomplete
- `idx_books_author_category` - Used for combined author+category queries

---

## Future Enhancements (Out of Scope for Epic 9)

1. **Many-to-Many Relationships**
   - Books can have multiple authors
   - Books can belong to multiple categories
   - Requires junction tables: `book_authors`, `book_categories_junction`

2. **Author Metadata**
   - Biography, photo, website
   - Birth date, nationality

3. **Category Hierarchy**
   - Parent/child categories
   - Category descriptions

4. **Soft Deletes**
   - Keep deleted authors/categories for historical data
   - Add `deleted_at` column

---

**Related Documents:**
- [Epic 9 PRD](../prd/epic-9.md)
- [Epic 9 Summary](../tasks/EPIC-9-SUMMARY.md)
- [Data Models and Schema](./data-models-and-schema.md)
