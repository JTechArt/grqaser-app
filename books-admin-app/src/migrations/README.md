# Database Migrations

This directory contains database migration scripts for the Grqaser Books Admin App.

## Overview

Migrations are used to evolve the database schema over time while preserving existing data. Each migration is numbered sequentially and includes both "up" (apply) and "down" (rollback) functions.

## Available Migrations

### Migration 001: Normalize Authors and Categories (Epic 9)

**Purpose:** Normalize the database schema by creating separate tables for authors and categories, eliminating data duplication and enabling efficient filtering.

**Changes:**
- Creates `authors` table with unique author names
- Creates `book_categories` table with unique category names
- Adds `author_id` and `category_id` foreign key columns to `books` table
- Populates new tables from existing book data
- Creates indexes for optimal query performance
- Preserves original `author` and `category` columns for backward compatibility

**Files:**
- Migration: `001-normalize-authors-categories.js`
- Run script: `../scripts/run-migration-001.js`
- Rollback script: `../scripts/rollback-migration-001.js`
- Verify script: `../scripts/verify-migration-001.js`

## Running Migrations

### Run Migration 001

```bash
# On default database (data/grqaser.db)
node books-admin-app/scripts/run-migration-001.js

# On custom database
node books-admin-app/scripts/run-migration-001.js /path/to/database.db
```

**What happens:**
1. Creates automatic backup (e.g., `data/grqaser_backup_1234567890.db`)
2. Runs migration with data integrity checks
3. Displays before/after statistics
4. Verifies no data loss

### Verify Migration

```bash
# Verify default database
node books-admin-app/scripts/verify-migration-001.js

# Verify custom database
node books-admin-app/scripts/verify-migration-001.js /path/to/database.db
```

**Verification checks:**
- Tables exist (authors, book_categories, books)
- Columns exist (author_id, category_id)
- Data counts match expectations
- Indexes are created
- Joins work correctly
- Sample data looks good

### Rollback Migration

```bash
# Rollback default database
node books-admin-app/scripts/rollback-migration-001.js

# Rollback custom database
node books-admin-app/scripts/rollback-migration-001.js /path/to/database.db
```

**What happens:**
1. Creates backup before rollback
2. Drops indexes
3. Clears foreign key columns (sets to NULL)
4. Drops authors and book_categories tables

**Note:** SQLite doesn't support DROP COLUMN, so `author_id` and `category_id` columns remain but are set to NULL.

## Migration Safety Features

### Automatic Backups

Every migration run creates a timestamped backup before making any changes:
```
data/grqaser_backup_1234567890.db
```

### Data Integrity Checks

Migrations verify:
- Total book count remains unchanged
- Books with author_id matches books with valid authors
- Books with category_id matches books with valid categories
- No orphaned records

### Idempotency

Migrations can be run multiple times safely. They check for existing tables/columns and skip creation if already present.

### Rollback Support

Every migration includes a `down()` function to reverse changes if needed.

## Best Practices

1. **Always backup before migration** (done automatically)
2. **Test on development database first**
3. **Verify results** using the verify script
4. **Keep backups** for at least 30 days
5. **Run migrations during low-traffic periods**
6. **Monitor application** after migration

## Troubleshooting

### Migration fails with "table already exists"

This is normal if the migration was partially run. The migration is idempotent and will skip existing tables.

### Data integrity check fails

1. Check the error message for specific issues
2. Restore from backup: `cp data/grqaser_backup_*.db data/grqaser.db`
3. Report the issue with error details

### Need to restore from backup

```bash
# List backups
ls -lh data/grqaser_backup_*.db

# Restore specific backup
cp data/grqaser_backup_1234567890.db data/grqaser.db
```

## Testing

Migration tests are located in `tests/migration-001.test.js`:

```bash
# Run migration tests
npm test -- tests/migration-001.test.js
```

Tests cover:
- Table creation
- Data population
- Foreign key updates
- Index creation
- Data integrity
- Rollback functionality
- Idempotency

## Future Migrations

When creating new migrations:

1. Create migration file: `src/migrations/00X-description.js`
2. Implement `up()` and `down()` functions
3. Add data integrity checks
4. Create run/rollback scripts in `scripts/`
5. Write comprehensive tests
6. Update this README

## References

- [Epic 9 Schema Changes](../../docs/architecture/epic-9-schema-changes.md)
- [Data Models and Schema](../../docs/architecture/data-models-and-schema.md)
- [Story 9.1 Implementation](../../docs/stories/9.1-implementation-readiness.md)

