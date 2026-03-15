const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SmartCrawlLinkGenerator {
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

  async createCrawlLinksTable() {
    console.log('🔧 Creating crawl_links table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS crawl_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'NEW',
        priority INTEGER DEFAULT 1,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        error_message TEXT,
        books_found INTEGER DEFAULT 0,
        books_saved INTEGER DEFAULT 0,
        processing_started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(book_id)
      )
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(createTableSQL, (err) => {
        if (err) {
          console.error('❌ Failed to create crawl_links table:', err);
          reject(err);
        } else {
          console.log('✅ Crawl links table created/verified');
          resolve();
        }
      });
    });
  }

  async truncateCrawlLinksTable() {
    console.log('🗑️  Truncating crawl_links table...');
    
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM crawl_links', (err) => {
        if (err) {
          console.error('❌ Failed to truncate crawl_links table:', err);
          reject(err);
        } else {
          console.log('✅ Crawl links table truncated');
          resolve();
        }
      });
    });
  }

  async getExistingBooksStatus() {
    console.log('📊 Analyzing existing books in database...');
    
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          id,
          crawl_status,
          crawl_error,
          crawl_attempts,
          main_audio_url,
          title
        FROM books 
        ORDER BY id
      `, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        const bookStatus = {};
        rows.forEach(book => {
          bookStatus[book.id] = {
            exists: true,
            crawl_status: book.crawl_status,
            crawl_error: book.crawl_error,
            crawl_attempts: book.crawl_attempts,
            has_audio: book.main_audio_url && book.main_audio_url.trim() !== '',
            title: book.title
          };
        });
        
        console.log(`   Found ${rows.length} existing books in database`);
        resolve(bookStatus);
      });
    });
  }

  async generateSmartCrawlLinks(startId = 1, endId = 1200) {
    console.log(`🔧 Generating smart crawl links from ID ${startId} to ${endId}...`);
    
    // Get existing books status
    const existingBooks = await this.getExistingBooksStatus();
    
    // Generate crawl links with smart status assignment
    const insertPromises = [];
    let successCount = 0;
    let newCount = 0;
    let failedCount = 0;
    
    for (let bookId = startId; bookId <= endId; bookId++) {
      const url = `https://grqaser.org/hy/books/${bookId}`;
      
      let status = 'NEW';
      let errorMessage = null;
      let booksFound = 0;
      let booksSaved = 0;
      let completedAt = null;
      
      if (existingBooks[bookId]) {
        const book = existingBooks[bookId];
        
        if (book.crawl_status === 'completed' || book.has_audio) {
          status = 'SUCCESS';
          booksFound = 1;
          booksSaved = 1;
          completedAt = new Date().toISOString();
          successCount++;
        } else if (book.crawl_status === 'failed' || book.crawl_error) {
          status = 'FAILED';
          errorMessage = book.crawl_error || 'Previous crawl failed';
          failedCount++;
        } else if (book.crawl_status === 'pending' || book.crawl_status === 'processing') {
          status = 'NEW'; // Reset to NEW for retry
          newCount++;
        }
      } else {
        newCount++;
      }
      
      const insertPromise = new Promise((resolve, reject) => {
        this.db.run(`
          INSERT INTO crawl_links (
            book_id, url, status, error_message, books_found, books_saved, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [bookId, url, status, errorMessage, booksFound, booksSaved, completedAt], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      insertPromises.push(insertPromise);
    }
    
    // Execute all inserts
    try {
      await Promise.all(insertPromises);
      console.log(`✅ Generated ${endId - startId + 1} crawl links`);
      console.log(`   📊 Status breakdown:`);
      console.log(`      ✅ SUCCESS: ${successCount} (already completed)`);
      console.log(`      🔄 NEW: ${newCount} (ready for crawling)`);
      console.log(`      ❌ FAILED: ${failedCount} (previous failures)`);
    } catch (error) {
      console.error('❌ Error generating crawl links:', error);
      throw error;
    }
  }

  async showSummary() {
    console.log('\n📊 === SMART CRAWL LINKS SUMMARY ===');
    
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          status,
          COUNT(*) as count,
          SUM(books_found) as total_books_found,
          SUM(books_saved) as total_books_saved
        FROM crawl_links 
        GROUP BY status
        ORDER BY count DESC
      `, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        let totalLinks = 0;
        let totalBooksFound = 0;
        let totalBooksSaved = 0;
        
        console.log('📋 Status Breakdown:');
        rows.forEach(row => {
          console.log(`   ${row.status}: ${row.count} links`);
          if (row.total_books_found > 0) {
            console.log(`     📖 Books found: ${row.total_books_found}`);
          }
          if (row.total_books_saved > 0) {
            console.log(`     💾 Books saved: ${row.total_books_saved}`);
          }
          
          totalLinks += row.count;
          totalBooksFound += row.total_books_found || 0;
          totalBooksSaved += row.total_books_saved || 0;
        });
        
        console.log(`\n📊 TOTAL: ${totalLinks} links`);
        console.log(`📖 Total books found: ${totalBooksFound}`);
        console.log(`💾 Total books saved: ${totalBooksSaved}`);
        
        // Show ready for crawling
        const newLinks = rows.find(row => row.status === 'NEW');
        if (newLinks) {
          console.log(`\n🚀 Ready for crawling: ${newLinks.count} NEW links`);
        }
        
        resolve();
      });
    });
  }

  async showSampleLinks(limit = 5) {
    console.log(`\n📋 === SAMPLE CRAWL LINKS (first ${limit} of each status) ===`);
    
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          book_id, url, status, error_message, books_found, books_saved
        FROM crawl_links 
        ORDER BY book_id
        LIMIT ?
      `, [limit * 3], (err, rows) => {
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
            console.log('');
          });
        }
        resolve();
      });
    });
  }

  async run(startId = 1, endId = 1200) {
    console.log('🚀 Starting Smart Crawl Link Generation...');
    console.log(`📊 Range: ${startId} to ${endId}`);
    
    try {
      // Initialize database
      await this.initialize();
      
      // Create/verify table structure
      await this.createCrawlLinksTable();
      
      // Truncate existing data
      await this.truncateCrawlLinksTable();
      
      // Generate smart crawl links
      await this.generateSmartCrawlLinks(startId, endId);
      
      // Show summary
      await this.showSummary();
      
      // Show sample links
      await this.showSampleLinks();
      
      console.log('\n✅ Smart crawl link generation completed successfully!');
      console.log('\n🎯 Next steps:');
      console.log('   1. Run: node check-crawl-status.js (to verify)');
      console.log('   2. Run: node src/sequential-crawler.js (to start crawling)');
      
    } catch (error) {
      console.error('❌ Smart crawl link generation failed:', error);
      throw error;
    } finally {
      if (this.db) {
        this.db.close();
      }
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  let startId = 1;
  let endId = 1200;
  
  if (args.length >= 1) {
    startId = parseInt(args[0]);
  }
  if (args.length >= 2) {
    endId = parseInt(args[1]);
  }
  
  const generator = new SmartCrawlLinkGenerator();
  generator.run(startId, endId).catch(console.error);
}

module.exports = SmartCrawlLinkGenerator;
