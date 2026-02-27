#!/usr/bin/env node
/**
 * Rollback migration 001: Normalize Authors and Categories
 * 
 * Usage:
 *   node scripts/rollback-migration-001.js [path-to-db]
 * 
 * If no path is provided, uses the default data/grqaser.db
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const migration = require('../src/migrations/001-normalize-authors-categories');

// Get database path from command line or use default
const dbPath = process.argv[2] || path.join(__dirname, '../../data/grqaser.db');

console.log(`Rolling back migration on database: ${dbPath}`);

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error(`Error: Database not found at ${dbPath}`);
  process.exit(1);
}

// Create backup before rollback
const backupPath = dbPath.replace('.db', `_backup_before_rollback_${Date.now()}.db`);
console.log(`Creating backup at: ${backupPath}`);
fs.copyFileSync(dbPath, backupPath);

try {
  // Open database
  const db = new Database(dbPath);
  
  // Run rollback
  migration.down(db);
  
  // Close database
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

