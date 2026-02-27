# Migration Quick Start Guide

## Epic 9: Database Schema Normalization

This guide helps you quickly run and verify the database schema normalization migration.

---

## TL;DR - Quick Commands

```bash
# 1. Run migration on development database
node books-admin-app/scripts/run-migration-001.js data/grqaser.db

# 2. Verify migration
node books-admin-app/scripts/verify-migration-001.js data/grqaser.db

# 3. Run tests
cd books-admin-app && npm test -- tests/migration-001.test.js
```

---

## What This Migration Does

✅ Creates `authors` table with 286 unique authors  
✅ Creates `book_categories` table with 16 unique categories  
✅ Adds `author_id` and `category_id` columns to `books` table  
✅ Populates foreign keys from existing data  
✅ Creates 6 indexes for performance  
✅ Preserves original `author` and `category` columns  
✅ Zero data loss (verified)

---

## Before You Start

### Prerequisites
- Node.js installed
- better-sqlite3 package installed (`npm install` in books-admin-app)
- Database file exists at `data/grqaser.db`

### Safety Check
```bash
# Check database exists
ls -lh data/grqaser.db

# Check database is not in use
lsof data/grqaser.db  # Should return nothing
```

---

## Step-by-Step Migration

### Step 1: Run Migration

```bash
node books-admin-app/scripts/run-migration-001.js data/grqaser.db
```

**Expected output:**
```
Running migration on database: data/grqaser.db
Creating backup at: data/grqaser_backup_TIMESTAMP.db
Starting migration 001: Normalize Authors and Categories...
Before migration: { totalBooks: 951, ... }
Step 1: Creating authors and book_categories tables...
Step 2: Adding foreign key columns to books table...
Step 3: Populating authors table...
Step 4: Populating book_categories table...
Step 5: Updating books.author_id...
Step 6: Updating books.category_id...
Step 7: Creating indexes...
After migration: { totalBooks: 951, totalAuthors: 286, ... }
✅ Data integrity verified successfully!
Migration 001 completed successfully!
```

**Time:** ~2 seconds for 951 books

### Step 2: Verify Migration

```bash
node books-admin-app/scripts/verify-migration-001.js data/grqaser.db
```

**Expected output:**
```
=== Migration Verification Report ===

1. Checking tables...
   ✅ Authors table: EXISTS
   ✅ Book_categories table: EXISTS
   ✅ Books table: EXISTS

2. Checking books table columns...
   ✅ author_id column: EXISTS
   ✅ category_id column: EXISTS

3. Checking data counts...
   Total books: 951
   Total authors: 286
   Total categories: 16
   Books with author_id: 951 (100.0%)
   Books with category_id: 949 (99.8%)

4. Checking indexes...
   ✅ idx_authors_name
   ✅ idx_categories_name
   ✅ idx_books_author_id
   ✅ idx_books_category_id
   ✅ idx_books_duration
   ✅ idx_books_author_category

...

=== Verification Complete ===
✅ Migration appears to be successful!
```

### Step 3: Test Queries

```bash
# Test JOIN query
sqlite3 data/grqaser.db "SELECT b.title, a.name as author, c.name as category FROM books b LEFT JOIN authors a ON b.author_id = a.id LEFT JOIN book_categories c ON b.category_id = c.id LIMIT 5;"

# Get top authors
sqlite3 data/grqaser.db "SELECT a.name, COUNT(*) as count FROM books b JOIN authors a ON b.author_id = a.id GROUP BY a.id ORDER BY count DESC LIMIT 10;"

# Get categories
sqlite3 data/grqaser.db "SELECT name FROM book_categories ORDER BY name;"
```

---

## Troubleshooting

### Migration already run?
No problem! The migration is **idempotent** - safe to run multiple times.

### Need to rollback?
```bash
node books-admin-app/scripts/rollback-migration-001.js data/grqaser.db
```

### Need to restore from backup?
```bash
# List backups
ls -lh data/grqaser_backup_*.db

# Restore
cp data/grqaser_backup_TIMESTAMP.db data/grqaser.db
```

### Migration fails?
1. Check error message
2. Restore from backup (created automatically)
3. Report issue with error details

---

## Testing

```bash
# Run migration tests
cd books-admin-app
npm test -- tests/migration-001.test.js

# Expected: 14/14 tests passing
```

---

## What Changed?

### New Tables
- `authors` (id, name, created_at, updated_at)
- `book_categories` (id, name, created_at, updated_at)

### Updated Table
- `books` - added columns:
  - `author_id` (INTEGER, references authors.id)
  - `category_id` (INTEGER, references book_categories.id)

### New Indexes
- `idx_authors_name`
- `idx_categories_name`
- `idx_books_author_id`
- `idx_books_category_id`
- `idx_books_duration`
- `idx_books_author_category`

### Preserved
- Original `author` and `category` columns (for backward compatibility)

---

## Next Steps

After successful migration:

1. ✅ Verify all checks pass
2. ✅ Test sample queries
3. ✅ Keep backup for 30 days
4. 🚀 Proceed to Story 9.2: Advanced Search Backend

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `run-migration-001.js` | Run migration (creates backup) |
| `verify-migration-001.js` | Verify migration success |
| `rollback-migration-001.js` | Rollback migration |
| `npm test -- tests/migration-001.test.js` | Run tests |

---

## Support

- **Documentation:** `books-admin-app/src/migrations/README.md`
- **Story:** `docs/stories/9.1.database-schema-normalization.md`
- **Architecture:** `docs/architecture/epic-9-schema-changes.md`
- **Tests:** `books-admin-app/tests/migration-001.test.js`

---

**Last Updated:** 2026-02-27  
**Epic:** 9 - Advanced Book Search and Data Normalization  
**Story:** 9.1 - Database Schema Normalization

