const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class BookRangeDiscoverer {
  constructor() {
    this.baseUrl = 'https://grqaser.org';
    this.dbPath = path.join(__dirname, 'data/grqaser.db');
    this.browser = null;
    this.page = null;
    this.db = null;
  }

  async initialize() {
    console.log('🚀 Initializing Book Range Discoverer...');
    
    try {
      // Initialize database
      await this.initializeDatabase();
      
      // Launch browser
      await this.launchBrowser();
      
      console.log('✅ Book range discoverer initialization complete');
      return true;
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      return false;
    }
  }

  async initializeDatabase() {
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

  async launchBrowser() {
    console.log('🔧 Launching browser...');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('✅ Browser launched');
  }

  async getCurrentBookRange() {
    console.log('📊 Checking current book range in database...');
    
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

  async discoverBookRange(startId = 100, endId = 2000, step = 50) {
    console.log(`🔍 Discovering book range from ${startId} to ${endId}...`);
    
    const foundBooks = [];
    const notFoundCount = 0;
    const maxConsecutiveNotFound = 20; // Stop if 20 consecutive books not found
    
    for (let bookId = startId; bookId <= endId; bookId += step) {
      const bookUrl = `/hy/books/${bookId}`;
      const fullUrl = `${this.baseUrl}${bookUrl}`;
      
      console.log(`   Testing: ${fullUrl}`);
      
      try {
        const response = await this.page.goto(fullUrl, { 
          waitUntil: 'networkidle2',
          timeout: 10000 
        });
        
        if (response.status() === 200) {
          // Check if it's actually a book page (not just a valid URL)
          const hasBookContent = await this.page.evaluate(() => {
            const titleSelectors = ['h1', '.book-title', '.title', '[class*="title"]'];
            for (const selector of titleSelectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent.trim()) {
                return true;
              }
            }
            return false;
          });
          
          if (hasBookContent) {
            foundBooks.push(bookId);
            console.log(`   ✅ Found book at ID ${bookId}`);
          } else {
            console.log(`   ⚠️  Valid URL but no book content at ID ${bookId}`);
          }
        } else {
          console.log(`   ❌ Not found (${response.status()}) at ID ${bookId}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error testing ID ${bookId}: ${error.message}`);
      }
      
      // Wait between requests
      await this.page.waitForTimeout(1000);
      
      // Progress update
      if (bookId % 500 === 0) {
        console.log(`   Progress: ${bookId}/${endId} (${((bookId - startId) / (endId - startId) * 100).toFixed(1)}%)`);
      }
    }
    
    return foundBooks;
  }

  async findHighestBookId() {
    console.log('🔍 Finding highest book ID...');
    
    // Start from a reasonable range and use binary search approach
    let low = 100;
    let high = 5000;
    let highestFound = 0;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const bookUrl = `/hy/books/${mid}`;
      const fullUrl = `${this.baseUrl}${bookUrl}`;
      
      console.log(`   Testing ID ${mid}...`);
      
      try {
        const response = await this.page.goto(fullUrl, { 
          waitUntil: 'networkidle2',
          timeout: 10000 
        });
        
        if (response.status() === 200) {
          // Check if it's actually a book page
          const hasBookContent = await this.page.evaluate(() => {
            const titleSelectors = ['h1', '.book-title', '.title', '[class*="title"]'];
            for (const selector of titleSelectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent.trim()) {
                return true;
              }
            }
            return false;
          });
          
          if (hasBookContent) {
            highestFound = mid;
            low = mid + 1; // Search higher
            console.log(`   ✅ Found book at ID ${mid}, searching higher...`);
          } else {
            high = mid - 1; // Search lower
            console.log(`   ⚠️  Valid URL but no book content at ID ${mid}, searching lower...`);
          }
        } else {
          high = mid - 1; // Search lower
          console.log(`   ❌ Not found at ID ${mid}, searching lower...`);
        }
        
      } catch (error) {
        high = mid - 1; // Search lower
        console.log(`   ❌ Error at ID ${mid}: ${error.message}, searching lower...`);
      }
      
      await this.page.waitForTimeout(500);
    }
    
    return highestFound;
  }

  async generateQueueForRemainingBooks() {
    console.log('📋 Generating queue for remaining books...');
    
    const currentRange = await this.getCurrentBookRange();
    const startId = currentRange.max_id + 1;
    
    console.log(`   Starting from ID: ${startId}`);
    
    // Find the highest book ID
    const highestId = await this.findHighestBookId();
    
    if (highestId > startId) {
      console.log(`   Highest book ID found: ${highestId}`);
      console.log(`   Books to crawl: ${highestId - startId + 1}`);
      
      // Generate queue
      return new Promise((resolve, reject) => {
        const insertPromises = [];
        for (let bookId = startId; bookId <= highestId; bookId++) {
          insertPromises.push(
            new Promise((resolveInsert, rejectInsert) => {
              this.db.run(
                'INSERT OR IGNORE INTO book_queue (book_id) VALUES (?)',
                [bookId],
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
            console.log(`✅ Generated queue for ${highestId - startId + 1} books (IDs ${startId}-${highestId})`);
            resolve({ startId, endId: highestId, count: highestId - startId + 1 });
          })
          .catch(reject);
      });
    } else {
      console.log('   No new books found to crawl');
      return { startId, endId: startId - 1, count: 0 };
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    if (this.db) {
      this.db.close();
    }
  }
}

// Main execution
async function main() {
  const discoverer = new BookRangeDiscoverer();
  
  try {
    const initialized = await discoverer.initialize();
    if (!initialized) {
      console.error('❌ Failed to initialize book range discoverer');
      return;
    }
    
    console.log('\n📊 === CURRENT STATUS ===');
    await discoverer.getCurrentBookRange();
    
    console.log('\n🔍 === DISCOVERING NEW BOOKS ===');
    const queueInfo = await discoverer.generateQueueForRemainingBooks();
    
    console.log('\n📋 === QUEUE GENERATION SUMMARY ===');
    console.log(`   Start ID: ${queueInfo.startId}`);
    console.log(`   End ID: ${queueInfo.endId}`);
    console.log(`   Total books to crawl: ${queueInfo.count}`);
    
    if (queueInfo.count > 0) {
      console.log('\n✅ Queue generated successfully!');
      console.log('   You can now run the sequential crawler to process these books.');
    } else {
      console.log('\n✅ No new books found to crawl.');
    }
    
  } catch (error) {
    console.error('❌ Error discovering book range:', error);
  } finally {
    await discoverer.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  BookRangeDiscoverer
};
