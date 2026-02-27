#!/usr/bin/env node
/**
 * Run migration 001: Normalize Authors and Categories
 * 
 * Usage:
 *   node scripts/run-migration-001.js [path-to-db]
 * 
 * If no path is provided, uses the default data/grqaser.db
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const migration = require('../src/migrations/001-normalize-authors-categories');

// Get database path from command line or use default
const dbPath = process.argv[2] || path.join(__dirname, '../../data/grqaser.db');

console.log(`Running migration on database: ${dbPath}`);

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error(`Error: Database not found at ${dbPath}`);
  process.exit(1);
}

// Create backup before migration
const backupPath = dbPath.replace('.db', `_backup_${Date.now()}.db`);
console.log(`Creating backup at: ${backupPath}`);
fs.copyFileSync(dbPath, backupPath);

try {
  // Open database
  const db = new Database(dbPath);
  
  // Run migration
  const result = migration.up(db);
  
  // Close database
  db.close();
  
  console.log('\n✅ Migration completed successfully!');
  console.log(`Backup saved at: ${backupPath}`);
  
  process.exit(0);
} catch (err) {
  console.error('\n❌ Migration failed:', err.message);
  console.error(err.stack);
  console.log(`\nBackup available at: ${backupPath}`);
  console.log('You can restore it by copying it back to the original location.');
  process.exit(1);
}

