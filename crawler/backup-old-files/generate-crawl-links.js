const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class CrawlLinkGenerator {
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

  async getCurrentBookRange() {
    console.log('📊 Checking current book range...');
    
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          MIN(id) as min_id,
          MAX(id) as max_id,
          COUNT(*) as total_books,
          COUNT(CASE WHEN crawl_status = 'completed' THEN 1 END) as completed_books
        FROM books
      `, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log(`   Current range: ${row.min_id} to ${row.max_id}`);
        console.log(`   Total books: ${row.total_books}`);
        console.log(`   Completed: ${row.completed_books}`);
        
        resolve(row);
      });
    });
  }

  async generateCrawlLinks(startId = 100, endId = 2000) {
    console.log(`🔧 Generating crawl links from ID ${startId} to ${endId}...`);
    
    return new Promise((resolve, reject) => {
      // First, clear existing crawl links
      this.db.run('DELETE FROM crawl_links', (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log('   Cleared existing crawl links');
        
        // Generate new crawl links
        const insertPromises = [];
        for (let bookId = startId; bookId <= endId; bookId++) {
          const bookUrl = `/hy/books/${bookId}`;
          const fullUrl = `https://grqaser.org${bookUrl}`;
          
          insertPromises.push(
            new Promise((resolveInsert, rejectInsert) => {
              this.db.run(
                'INSERT INTO crawl_links (book_id, url, status) VALUES (?, ?, ?)',
                [bookId, fullUrl, 'NEW'],
                (err) => {
                  if (err) rejectInsert(err);
                  else resolveInsert();
                }
              );
            })
          );
        }
        
        Promise.all(insertPromises)
          .then(() => {
            console.log(`✅ Generated ${endId - startId + 1} crawl links`);
            resolve(endId - startId + 1);
          })
          .catch(reject);
      });
    });
  }

  async generateCrawlLinksFromCurrentPosition() {
    console.log('📋 Generating crawl links from current position...');
    
    const currentRange = await this.getCurrentBookRange();
    const startId = currentRange.max_id + 1;
    const endId = 2000; // Default end ID
    
    console.log(`   Starting from ID: ${startId}`);
    console.log(`   Ending at ID: ${endId}`);
    
    if (startId > endId) {
      console.log('   No new books to generate links for');
      return 0;
    }
    
    return await this.generateCrawlLinks(startId, endId);
  }

  async getCrawlLinksStatistics() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          status,
          COUNT(*) as count
        FROM crawl_links 
        GROUP BY status
        ORDER BY count DESC
      `, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async showCrawlLinksSummary() {
    console.log('\n📊 === CRAWL LINKS SUMMARY ===');
    
    try {
      const stats = await this.getCrawlLinksStatistics();
      
      if (stats.length === 0) {
        console.log('   No crawl links found');
        return;
      }
      
      stats.forEach(stat => {
        console.log(`   ${stat.status}: ${stat.count} links`);
      });
      
      // Show some example links
      console.log('\n📋 === SAMPLE LINKS ===');
      this.db.all(`
        SELECT book_id, url, status, created_at
        FROM crawl_links 
        ORDER BY book_id ASC
        LIMIT 5
      `, (err, rows) => {
        if (err) {
          console.error('❌ Error fetching sample links:', err);
          return;
        }
        
        rows.forEach(row => {
          console.log(`   ID: ${row.book_id} | Status: ${row.status} | URL: ${row.url}`);
        });
      });
      
    } catch (error) {
      console.error('❌ Error showing crawl links summary:', error);
    }
  }

  async cleanup() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Main execution
async function main() {
  const generator = new CrawlLinkGenerator();
  
  try {
    await generator.initialize();
    await generator.createCrawlLinksTable();
    
    console.log('\n📊 === CURRENT STATUS ===');
    await generator.getCurrentBookRange();
    
    console.log('\n🔧 === GENERATING CRAWL LINKS ===');
    const linksGenerated = await generator.generateCrawlLinksFromCurrentPosition();
    
    console.log('\n📋 === FINAL SUMMARY ===');
    await generator.showCrawlLinksSummary();
    
    console.log(`\n✅ Successfully generated ${linksGenerated} crawl links!`);
    console.log('\n🎯 Next steps:');
    console.log('   1. Run the crawler to process NEW links');
    console.log('   2. Monitor progress with status checker');
    console.log('   3. Check failed links for investigation');
    
  } catch (error) {
    console.error('❌ Error generating crawl links:', error);
  } finally {
    await generator.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  CrawlLinkGenerator
};
