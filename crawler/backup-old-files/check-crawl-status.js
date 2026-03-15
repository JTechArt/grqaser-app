const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class CrawlStatusChecker {
  constructor() {
    this.dbPath = path.join(__dirname, 'data/grqaser.db');
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Database connection failed:', err);
          reject(err);
          return;
        }
        console.log('✅ Database connected');
        resolve();
      });
    });
  }

  async checkCrawlStatus() {
    console.log('\n📊 === CRAWL STATUS REPORT ===\n');

    // Check books table status
    await this.checkBooksStatus();
    
    // Check crawl links status
    await this.checkCrawlLinksStatus();
    
    // Check 404s
    await this.check404Status();
    
    // Summary
    await this.printSummary();
  }

  async checkBooksStatus() {
    console.log('📚 === BOOKS TABLE STATUS ===');
    
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          crawl_status,
          COUNT(*) as count,
          COUNT(CASE WHEN main_audio_url IS NOT NULL AND main_audio_url != '' THEN 1 END) as with_audio,
          COUNT(CASE WHEN rating IS NOT NULL THEN 1 END) as with_rating
        FROM books 
        GROUP BY crawl_status
        ORDER BY count DESC
      `, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (rows.length === 0) {
          console.log('   No books found in database');
        } else {
          rows.forEach(row => {
            console.log(`   ${row.crawl_status}: ${row.count} books`);
            if (row.with_audio > 0) {
              console.log(`     📻 With audio: ${row.with_audio}`);
            }
            if (row.with_rating > 0) {
              console.log(`     ⭐ With rating: ${row.with_rating}`);
            }
          });
        }
        resolve();
      });
    });
  }

  async checkCrawlLinksStatus() {
    console.log('\n📋 === CRAWL LINKS STATUS ===');
    
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          status,
          COUNT(*) as count,
          SUM(books_found) as total_books_found,
          SUM(books_saved) as total_books_saved,
          AVG(retry_count) as avg_retries
        FROM crawl_links 
        GROUP BY status
        ORDER BY count DESC
      `, (err, rows) => {
        if (err) {
          // Table might not exist yet
          console.log('   Crawl links table not found (not created yet)');
          resolve();
          return;
        }
        
        if (rows.length === 0) {
          console.log('   No crawl links found');
        } else {
          rows.forEach(row => {
            console.log(`   ${row.status}: ${row.count} links`);
            if (row.total_books_found > 0) {
              console.log(`     📖 Books found: ${row.total_books_found}`);
            }
            if (row.total_books_saved > 0) {
              console.log(`     💾 Books saved: ${row.total_books_saved}`);
            }
            if (row.avg_retries > 0) {
              console.log(`     🔄 Avg retries: ${row.avg_retries.toFixed(1)}`);
            }
          });
        }
        resolve();
      });
    });
  }

  async check404Status() {
    console.log('\n❌ === 404 STATUS ===');
    
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT COUNT(*) as count
        FROM not_found_books
      `, (err, row) => {
        if (err) {
          // Table might not exist yet
          console.log('   Not found books table not found (not created yet)');
          resolve();
          return;
        }
        
        console.log(`   Total 404s: ${row.count}`);
        resolve();
      });
    });
  }

  async printSummary() {
    console.log('\n📈 === SUMMARY ===');
    
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(*) as total_books,
          COUNT(CASE WHEN crawl_status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN crawl_status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN crawl_status = 'pending' THEN 1 END) as pending
        FROM books
      `, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        const total = row.total_books;
        const completed = row.completed;
        const failed = row.failed;
        const pending = row.pending;
        
        console.log(`   Total books in database: ${total}`);
        console.log(`   Successfully crawled: ${completed}`);
        console.log(`   Failed to crawl: ${failed}`);
        console.log(`   Pending: ${pending}`);
        
        if (total > 0) {
          const successRate = ((completed / total) * 100).toFixed(1);
          console.log(`   Success rate: ${successRate}%`);
        }
        
        resolve();
      });
    });
  }

  async showRecentCrawlLinks(limit = 10) {
    console.log(`\n📋 === RECENT CRAWL LINKS (last ${limit}) ===`);
    
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          book_id, url, status, error_message, books_found, books_saved,
          processing_started_at, completed_at, created_at
        FROM crawl_links 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (rows.length === 0) {
          console.log('   No crawl links found');
        } else {
          rows.forEach(link => {
            console.log(`   ID: ${link.book_id} | Status: ${link.status}`);
            console.log(`     URL: ${link.url}`);
            if (link.books_found > 0) {
              console.log(`     📖 Found: ${link.books_found}, Saved: ${link.books_saved}`);
            }
            if (link.error_message) {
              console.log(`     ❌ Error: ${link.error_message}`);
            }
            if (link.processing_started_at) {
              console.log(`     ⏱️  Started: ${link.processing_started_at}`);
            }
            if (link.completed_at) {
              console.log(`     ✅ Completed: ${link.completed_at}`);
            }
            console.log('');
          });
        }
        resolve();
      });
    });
  }

  async showFailedCrawlLinks(limit = 10) {
    console.log(`\n❌ === FAILED CRAWL LINKS (last ${limit}) ===`);
    
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          book_id, url, error_message, retry_count, max_retries,
          processing_started_at, completed_at
        FROM crawl_links 
        WHERE status = 'FAILED'
        ORDER BY completed_at DESC 
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (rows.length === 0) {
          console.log('   No failed crawl links found');
        } else {
          rows.forEach(link => {
            console.log(`   ID: ${link.book_id} | Retries: ${link.retry_count}/${link.max_retries}`);
            console.log(`     URL: ${link.url}`);
            console.log(`     Error: ${link.error_message || 'Unknown error'}`);
            if (link.processing_started_at) {
              console.log(`     Started: ${link.processing_started_at}`);
            }
            if (link.completed_at) {
              console.log(`     Failed: ${link.completed_at}`);
            }
            console.log('');
          });
        }
        resolve();
      });
    });
  }

  async cleanup() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Main execution
async function main() {
  const checker = new CrawlStatusChecker();
  
  try {
    await checker.initialize();
    await checker.checkCrawlStatus();
    
    // Show additional details if requested
    const args = process.argv.slice(2);
    if (args.includes('--recent')) {
      await checker.showRecentCrawlLinks(10);
    }
    if (args.includes('--failed')) {
      await checker.showFailedCrawlLinks(10);
    }
    
  } catch (error) {
    console.error('❌ Error checking crawl status:', error);
  } finally {
    await checker.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  CrawlStatusChecker
};
