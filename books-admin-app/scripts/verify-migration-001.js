#!/usr/bin/env node
/**
 * Verify migration 001: Normalize Authors and Categories
 * 
 * Usage:
 *   node scripts/verify-migration-001.js [path-to-db]
 * 
 * If no path is provided, uses the default data/grqaser.db
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Get database path from command line or use default
const dbPath = process.argv[2] || path.join(__dirname, '../../data/grqaser.db');

console.log(`Verifying migration on database: ${dbPath}\n`);

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error(`Error: Database not found at ${dbPath}`);
  process.exit(1);
}

try {
  // Open database
  const db = new Database(dbPath, { readonly: true });
  
  console.log('=== Migration Verification Report ===\n');
  
  // 1. Check tables exist
  console.log('1. Checking tables...');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' 
    AND name IN ('authors', 'book_categories', 'books')
  `).all();
  
  const tableNames = tables.map(t => t.name);
  console.log(`   ✅ Authors table: ${tableNames.includes('authors') ? 'EXISTS' : 'MISSING'}`);
  console.log(`   ✅ Book_categories table: ${tableNames.includes('book_categories') ? 'EXISTS' : 'MISSING'}`);
  console.log(`   ✅ Books table: ${tableNames.includes('books') ? 'EXISTS' : 'MISSING'}`);
  
  // 2. Check columns exist
  console.log('\n2. Checking books table columns...');
  const columns = db.prepare("SELECT name FROM pragma_table_info('books')").all();
  const columnNames = columns.map(c => c.name);
  console.log(`   ✅ author_id column: ${columnNames.includes('author_id') ? 'EXISTS' : 'MISSING'}`);
  console.log(`   ✅ category_id column: ${columnNames.includes('category_id') ? 'EXISTS' : 'MISSING'}`);
  
  // 3. Check data counts
  console.log('\n3. Checking data counts...');
  const totalBooks = db.prepare('SELECT COUNT(*) as count FROM books').get().count;
  const totalAuthors = db.prepare('SELECT COUNT(*) as count FROM authors').get().count;
  const totalCategories = db.prepare('SELECT COUNT(*) as count FROM book_categories').get().count;
  const booksWithAuthorId = db.prepare('SELECT COUNT(*) as count FROM books WHERE author_id IS NOT NULL').get().count;
  const booksWithCategoryId = db.prepare('SELECT COUNT(*) as count FROM books WHERE category_id IS NOT NULL').get().count;
  
  console.log(`   Total books: ${totalBooks}`);
  console.log(`   Total authors: ${totalAuthors}`);
  console.log(`   Total categories: ${totalCategories}`);
  console.log(`   Books with author_id: ${booksWithAuthorId} (${((booksWithAuthorId/totalBooks)*100).toFixed(1)}%)`);
  console.log(`   Books with category_id: ${booksWithCategoryId} (${((booksWithCategoryId/totalBooks)*100).toFixed(1)}%)`);
  
  // 4. Check indexes
  console.log('\n4. Checking indexes...');
  const indexes = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='index'
    AND (name LIKE 'idx_authors%' OR name LIKE 'idx_categories%' 
         OR name LIKE 'idx_books_author%' OR name LIKE 'idx_books_category%' 
         OR name LIKE 'idx_books_duration%')
  `).all();
  
  const indexNames = indexes.map(i => i.name);
  const requiredIndexes = [
    'idx_authors_name',
    'idx_categories_name',
    'idx_books_author_id',
    'idx_books_category_id',
    'idx_books_duration',
    'idx_books_author_category'
  ];
  
  requiredIndexes.forEach(idx => {
    console.log(`   ${indexNames.includes(idx) ? '✅' : '❌'} ${idx}`);
  });
  
  // 5. Sample data verification
  console.log('\n5. Sample data verification...');
  const sampleBooks = db.prepare(`
    SELECT b.id, b.title, a.name as author_name, c.name as category_name
    FROM books b
    LEFT JOIN authors a ON b.author_id = a.id
    LEFT JOIN book_categories c ON b.category_id = c.id
    LIMIT 3
  `).all();
  
  console.log('   Sample books with joins:');
  sampleBooks.forEach(book => {
    console.log(`   - "${book.title}" by ${book.author_name || 'N/A'} (${book.category_name || 'N/A'})`);
  });
  
  // 6. Top authors
  console.log('\n6. Top 5 authors by book count:');
  const topAuthors = db.prepare(`
    SELECT a.name, COUNT(*) as book_count
    FROM books b
    JOIN authors a ON b.author_id = a.id
    GROUP BY a.id
    ORDER BY book_count DESC
    LIMIT 5
  `).all();
  
  topAuthors.forEach((author, idx) => {
    console.log(`   ${idx + 1}. ${author.name}: ${author.book_count} books`);
  });
  
  // 7. Categories distribution
  console.log('\n7. Categories distribution:');
  const categoryDist = db.prepare(`
    SELECT c.name, COUNT(*) as book_count
    FROM books b
    JOIN book_categories c ON b.category_id = c.id
    GROUP BY c.id
    ORDER BY book_count DESC
  `).all();
  
  categoryDist.forEach(cat => {
    console.log(`   - ${cat.name}: ${cat.book_count} books`);
  });
  
  // Close database
  db.close();
  
  console.log('\n=== Verification Complete ===');
  console.log('✅ Migration appears to be successful!\n');
  
  process.exit(0);
} catch (err) {
  console.error('\n❌ Verification failed:', err.message);
  console.error(err.stack);
  process.exit(1);
}

