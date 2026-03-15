#!/usr/bin/env node
/**
 * Rollback migration 002: Admin Download Tables (Epic 12)
 *
 * Drops admin_downloaded_books and admin_download_batches tables.
 *
 * Usage:
 *   node scripts/rollback-migration-002.js [path-to-db]
 *
 * If no path is provided, uses the active DB from db-registry (Story 6.2)
 * or config default.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const migration = require('../src/migrations/002-admin-download-tables');

function getDbPath() {
  if (process.argv[2]) {
    return path.resolve(process.argv[2]);
  }
  try {
    const { getActivePath } = require('../src/models/db-registry');
    return getActivePath();
  } catch (e) {
    return path.join(__dirname, '../../data/grqaser.db');
  }
}

const dbPath = getDbPath();

console.log(`Rolling back migration 002 on database: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  console.error(`Error: Database not found at ${dbPath}`);
  process.exit(1);
}

const backupPath = dbPath.replace('.db', `_backup_before_rollback_002_${Date.now()}.db`);
console.log(`Creating backup at: ${backupPath}`);
fs.copyFileSync(dbPath, backupPath);

try {
  const db = new Database(dbPath);
  migration.down(db);
  db.close();

  console.log('\n✅ Rollback completed successfully!');
  console.log(`Backup saved at: ${backupPath}`);
  process.exit(0);
} catch (err) {
  console.error('\n❌ Rollback failed:', err.message);
  console.error(err.stack);
  console.log(`\nBackup available at: ${backupPath}`);
  process.exit(1);
}
