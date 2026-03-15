const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class SequentialCrawler {
  constructor() {
    this.baseUrl = 'https://grqaser.org';
    this.dbPath = path.join(__dirname, '../data/grqaser.db');
    this.dataDir = path.join(__dirname, '../data');
    this.browser = null;
    this.page = null;
    this.db = null;
    
    // Sequential crawling settings
    this.settings = {
      startId: 1,
      endId: 2000,
      delayBetweenRequests: 1000, // 1 second between requests
      timeout: 15000, // 15 seconds timeout per page
      retryAttempts: 2,
      maxConcurrentRequests: 1, // Sequential processing
      save404s: true // Save 404 responses for analysis
    };
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      booksFound: 0,
      booksSaved: 0,
      duplicatesSkipped: 0,
      errors: 0,
      startTime: Date.now(),
      currentId: 0
    };
    
    // Track seen books to avoid duplicates
    this.seenBooks = new Set();
  }

  async initialize() {
    console.log('🚀 Initializing Sequential Crawler...');
    
    try {
      // Create data directory
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Initialize database
      await this.initializeDatabase();
      
      // Load existing books to avoid duplicates
      await this.loadExistingBooks();
      
      // Launch browser
      await this.launchBrowser();
      
      console.log('✅ Sequential crawler initialization complete');
      return true;
    } catch (error) {
      console.error('❌ Sequential crawler initialization failed:', error);
      return false;
    }
  }

  async initializeDatabase() {
    console.log('🔧 Initializing database...');
    
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

  async createBooksTable() {
    console.log('🔧 Creating books table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        author VARCHAR(200) DEFAULT 'Unknown Author',
        description TEXT,
        duration VARCHAR(100),
        cover_image_url TEXT,
        main_audio_url TEXT,
        rating DECIMAL(3,2),
        type VARCHAR(50) DEFAULT 'audiobook',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(id)
      )
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(createTableSQL, (err) => {
        if (err) {
          console.error('❌ Failed to create books table:', err);
          reject(err);
        } else {
          console.log('✅ Books table created/verified');
          resolve();
        }
      });
    });
  }

  async create404LogTable() {
    console.log('🔧 Creating 404 log table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS not_found_books (
        id INTEGER PRIMARY KEY,
        book_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        status_code INTEGER DEFAULT 404,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(book_id)
      )
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(createTableSQL, (err) => {
        if (err) {
          console.error('❌ Failed to create not_found_books table:', err);
          reject(err);
        } else {
          console.log('✅ Not found books table created/verified');
          resolve();
        }
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

  async getNextNewLink() {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT id, book_id, url, retry_count, max_retries
        FROM crawl_links 
        WHERE status = 'NEW' 
        ORDER BY book_id ASC 
        LIMIT 1
      `, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async updateLinkStatus(linkId, status, errorMessage = null, booksFound = 0, booksSaved = 0) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE crawl_links 
        SET status = ?,
            error_message = ?,
            books_found = ?,
            books_saved = ?,
            updated_at = CURRENT_TIMESTAMP,
            ${status === 'IN_PROGRESS' ? 'processing_started_at = CURRENT_TIMESTAMP,' : ''}
            ${status === 'SUCCESS' || status === 'FAILED' ? 'completed_at = CURRENT_TIMESTAMP,' : ''}
            retry_count = CASE WHEN ? = 'RETRY' THEN retry_count + 1 ELSE retry_count END
        WHERE id = ?
      `;
      
      this.db.run(sql, [status, errorMessage, booksFound, booksSaved, status, linkId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
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
    
    // Set viewport and user agent
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set request interception to handle 404s
    await this.page.setRequestInterception(true);
    this.page.on('request', request => request.continue());
    
    console.log('✅ Browser launched');
  }

  async loadExistingBooks() {
    console.log('🔧 Loading existing books to avoid duplicates...');
    
    return new Promise((resolve, reject) => {
      this.db.all('SELECT id, title, author FROM books', (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        rows.forEach(row => {
          const key = `${row.title}|${row.author}`;
          this.seenBooks.add(key);
        });
        
        console.log(`📊 Loaded ${this.seenBooks.size} existing books`);
        resolve();
      });
    });
  }

  async crawl() {
    console.log('🎯 Starting sequential crawling process...');
    
    try {
      // Create tables if they don't exist
      await this.createBooksTable();
      await this.createCrawlLinksTable();
      await this.create404LogTable();
      
      // Check if we have crawl links to process
      const linksStats = await this.getCrawlLinksStatistics();
      if (linksStats.length === 0) {
        console.log('📋 No crawl links found. Please run generate-crawl-links.js first.');
        return;
      }
      
      console.log('📊 Crawl links status:');
      linksStats.forEach(stat => {
        console.log(`   ${stat.status}: ${stat.count} links`);
      });
      
      // Start sequential crawling from crawl links
      await this.crawlFromLinks();
      
    } catch (error) {
      console.error('❌ Sequential crawling failed:', error);
      this.stats.errors++;
    } finally {
      await this.cleanup();
      this.generateReport();
    }
  }

  async crawlSequentially() {
    console.log('🔧 Starting sequential book ID crawling...');
    
    for (let bookId = this.settings.startId; bookId <= this.settings.endId; bookId++) {
      this.stats.currentId = bookId;
      this.stats.totalRequests++;
      
      const bookUrl = `/hy/books/${bookId}`;
      const fullUrl = `${this.baseUrl}${bookUrl}`;
      
      console.log(`📖 [${bookId}/${this.settings.endId}] Crawling: ${fullUrl}`);
      
      try {
        const bookData = await this.crawlBookPage(fullUrl, bookId);
        
        if (bookData) {
          // Book found and extracted
          this.stats.successfulRequests++;
          
          if (await this.saveBook(bookData)) {
            this.stats.booksSaved++;
            console.log(`✅ [${bookId}] Book saved: "${bookData.title}" by ${bookData.author}`);
          } else {
            console.log(`⚠️ [${bookId}] Book already exists: "${bookData.title}" by ${bookData.author}`);
          }
        } else {
          // Book not found (404 or invalid page)
          this.stats.failedRequests++;
          
          if (this.settings.save404s) {
            await this.logNotFoundBook(bookId, fullUrl);
          }
          
          console.log(`❌ [${bookId}] Book not found (404)`);
        }
        
      } catch (error) {
        this.stats.failedRequests++;
        this.stats.errors++;
        console.error(`❌ [${bookId}] Error crawling book:`, error.message);
        
        // Log error for analysis
        await this.logNotFoundBook(bookId, fullUrl, error.message);
      }
      
      // Wait between requests to be respectful
      if (bookId < this.settings.endId) {
        await this.page.waitForTimeout(this.settings.delayBetweenRequests);
      }
      
      // Progress update every 50 books
      if (bookId % 50 === 0) {
        this.printProgress();
      }
    }
    
    console.log('🎉 Sequential crawling completed!');
  }

  async crawlFromLinks() {
    console.log('🔧 Starting sequential crawling from crawl links...');
    
    let processedCount = 0;
    
    while (true) {
      // Get next NEW link to process
      const nextLink = await this.getNextNewLink();
      
      if (!nextLink) {
        console.log('✅ No more NEW links to process');
        break;
      }
      
      const { id: linkId, book_id: bookId, url, retry_count, max_retries } = nextLink;
      this.stats.currentId = bookId;
      this.stats.totalRequests++;
      processedCount++;
      
      console.log(`📖 [${processedCount}] Processing: ${url}`);
      
      // Mark as IN_PROGRESS
      await this.updateLinkStatus(linkId, 'IN_PROGRESS');
      
      try {
        const bookData = await this.crawlBookPage(url, bookId);
        
        if (bookData) {
          // Book found and extracted
          this.stats.successfulRequests++;
          
          if (await this.saveBook(bookData)) {
            this.stats.booksSaved++;
            // Mark as SUCCESS
            await this.updateLinkStatus(linkId, 'SUCCESS', null, 1, 1);
            console.log(`✅ [${bookId}] Book saved: "${bookData.title}" by ${bookData.author}`);
          } else {
            // Book already exists but wasn't marked as completed
            await this.updateLinkStatus(linkId, 'SUCCESS', null, 1, 0);
            console.log(`⚠️ [${bookId}] Book already exists: "${bookData.title}" by ${bookData.author}`);
          }
        } else {
          // Book not found (404 or invalid page)
          this.stats.failedRequests++;
          
          if (this.settings.save404s) {
            await this.logNotFoundBook(bookId, url);
          }
          
          // Mark as FAILED with 404 error
          await this.updateLinkStatus(linkId, 'FAILED', 'Book not found (404)');
          console.log(`❌ [${bookId}] Book not found (404)`);
        }
        
      } catch (error) {
        this.stats.failedRequests++;
        this.stats.errors++;
        
        // Check if we should retry
        const shouldRetry = retry_count < max_retries;
        const newStatus = shouldRetry ? 'RETRY' : 'FAILED';
        const errorMessage = `Crawling error: ${error.message}`;
        
        // Mark as FAILED or RETRY with error details
        await this.updateLinkStatus(linkId, newStatus, errorMessage);
        
        console.error(`❌ [${bookId}] Error crawling book:`, error.message);
        if (shouldRetry) {
          console.log(`🔄 [${bookId}] Will retry (attempt ${retry_count + 1}/${max_retries})`);
        }
        
        // Log error for analysis
        await this.logNotFoundBook(bookId, url, error.message);
      }
      
      // Wait between requests to be respectful
      await this.page.waitForTimeout(this.settings.delayBetweenRequests);
      
      // Progress update every 50 books
      if (processedCount % 50 === 0) {
        this.printProgress();
        await this.printCrawlLinksStatus();
      }
    }
    
    console.log('🎉 Sequential crawling from links completed!');
  }

  async crawlBookPage(url, bookId) {
    try {
      // Navigate to the book page
      const response = await this.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: this.settings.timeout 
      });
      
      // Check if page exists (not 404)
      if (response.status() === 404) {
        return null;
      }
      
      // Wait for content to load
      await this.page.waitForTimeout(1000);
      
      // Extract book data
      const bookData = await this.extractBookData(bookId);
      
      if (bookData && bookData.title) {
        this.stats.booksFound++;
        return bookData;
      }
      
      return null;
      
    } catch (error) {
      // If navigation fails, it might be a 404
      if (error.message.includes('net::ERR_NAME_NOT_RESOLVED') || 
          error.message.includes('net::ERR_CONNECTION_REFUSED') ||
          error.message.includes('timeout')) {
        return null;
      }
      throw error;
    }
  }

  async extractBookData(bookId) {
    try {
      const bookData = await this.page.evaluate(() => {
        // Try multiple selectors for title
        const titleSelectors = [
          'h1',
          '.book-title',
          '.title',
          '[class*="title"]',
          '.book-name',
          '.book-name h1',
          '.book-name h2'
        ];
        
        let title = null;
        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            title = element.textContent.trim();
            break;
          }
        }
        
        // Try multiple selectors for author
        const authorSelectors = [
          '.author',
          '.book-author',
          '[class*="author"]',
          '.writer',
          '.book-writer'
        ];
        
        let author = 'Unknown Author';
        for (const selector of authorSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            author = element.textContent.trim();
            break;
          }
        }
        
        // Try multiple selectors for description
        const descSelectors = [
          '.description',
          '.book-description',
          '.summary',
          '.book-summary',
          '[class*="description"]',
          '[class*="summary"]'
        ];
        
        let description = '';
        for (const selector of descSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            description = element.textContent.trim();
            break;
          }
        }
        
        // Try multiple selectors for duration
        const durationSelectors = [
          '.duration',
          '.book-duration',
          '.time',
          '.book-time',
          '[class*="duration"]',
          '[class*="time"]'
        ];
        
        let duration = '';
        for (const selector of durationSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            duration = element.textContent.trim();
            break;
          }
        }
        
        // Try multiple selectors for rating
        const ratingSelectors = [
          '.rating',
          '.book-rating',
          '[class*="rating"]',
          '.stars',
          '.book-stars'
        ];
        
        let rating = null;
        for (const selector of ratingSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            const ratingText = element.textContent.trim();
            const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
            if (ratingMatch) {
              rating = parseFloat(ratingMatch[1]);
              break;
            }
          }
        }
        
        // Try multiple selectors for cover image
        const imageSelectors = [
          '.book-cover img',
          '.cover img',
          '.book-image img',
          '.image img',
          'img[src*="cover"]',
          'img[src*="book"]'
        ];
        
        let coverImage = '';
        for (const selector of imageSelectors) {
          const element = document.querySelector(selector);
          if (element && element.src) {
            coverImage = element.src;
            break;
          }
        }
        
        // Try multiple selectors for audio URL
        const audioSelectors = [
          'audio source',
          '.audio-player source',
          '.player source',
          '[class*="audio"] source',
          'audio[src]',
          '.audio-player[src]'
        ];
        
        let audioUrl = '';
        for (const selector of audioSelectors) {
          const element = document.querySelector(selector);
          if (element && element.src) {
            audioUrl = element.src;
            break;
          }
        }
        
        return {
          title,
          author,
          description,
          duration,
          rating,
          coverImage,
          audioUrl
        };
      });
      
      if (bookData && bookData.title) {
        return {
          id: bookId,
          title: bookData.title,
          author: bookData.author || 'Unknown Author',
          description: bookData.description || '',
          duration: bookData.duration || '',
          rating: bookData.rating,
          cover_image_url: bookData.coverImage || '',
          main_audio_url: bookData.audioUrl || '',
          type: 'audiobook'
        };
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ Error extracting book data for ID ${bookId}:`, error);
      return null;
    }
  }

  async saveBook(book) {
    // Check if book already exists
    const key = `${book.title}|${book.author}`;
    if (this.seenBooks.has(key)) {
      this.stats.duplicatesSkipped++;
      return false;
    }
    
    // Mark as seen
    this.seenBooks.add(key);
    
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO books 
        (id, title, author, description, duration, cover_image_url, main_audio_url, rating, type) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        book.id,
        book.title,
        book.author,
        book.description,
        book.duration,
        book.cover_image_url,
        book.main_audio_url,
        book.rating,
        book.type
      ];
      
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  async logNotFoundBook(bookId, url, errorMessage = null) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR IGNORE INTO not_found_books 
        (book_id, url, status_code) 
        VALUES (?, ?, 404)
      `;
      
      this.db.run(sql, [bookId, url], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  printProgress() {
    const progress = ((this.stats.currentId - this.settings.startId + 1) / (this.settings.endId - this.settings.startId + 1) * 100).toFixed(1);
    const successRate = this.stats.totalRequests > 0 ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(1) : 0;
    
    console.log(`\n📊 Progress: ${progress}% (${this.stats.currentId}/${this.settings.endId})`);
    console.log(`📖 Books found: ${this.stats.booksFound}`);
    console.log(`💾 Books saved: ${this.stats.booksSaved}`);
    console.log(`✅ Success rate: ${successRate}%`);
    console.log(`❌ Failed requests: ${this.stats.failedRequests}`);
    console.log('---');
  }

  async printCrawlLinksStatus() {
    try {
      const stats = await this.getCrawlLinksStatistics();
      console.log('\n📊 === CRAWL LINKS STATUS ===');
      stats.forEach(stat => {
        console.log(`   ${stat.status}: ${stat.count} links`);
      });
    } catch (error) {
      console.error('❌ Error printing crawl links status:', error);
    }
  }

  async cleanup() {
    console.log('🔧 Cleaning up...');
    
    if (this.browser) {
      await this.browser.close();
    }
    
    if (this.db) {
      this.db.close();
    }
  }

  generateReport() {
    const duration = Date.now() - this.stats.startTime;
    const durationMinutes = (duration / 1000 / 60).toFixed(2);
    const successRate = this.stats.totalRequests > 0 ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(1) : 0;
    
    console.log('\n📊 === SEQUENTIAL CRAWLER REPORT ===');
    console.log(`⏱️  Duration: ${durationMinutes} minutes`);
    console.log(`📊 Range crawled: ${this.settings.startId} to ${this.settings.endId}`);
    console.log(`📋 Total requests: ${this.stats.totalRequests}`);
    console.log(`✅ Successful requests: ${this.stats.successfulRequests}`);
    console.log(`❌ Failed requests: ${this.stats.failedRequests}`);
    console.log(`📖 Books found: ${this.stats.booksFound}`);
    console.log(`💾 Books saved: ${this.stats.booksSaved}`);
    console.log(`🔄 Duplicates skipped: ${this.stats.duplicatesSkipped}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`📊 Success rate: ${successRate}%`);
    
    console.log('\n🎯 === ANALYSIS ===');
    const totalRange = this.settings.endId - this.settings.startId + 1;
    const coverage = ((this.stats.booksFound / totalRange) * 100).toFixed(1);
    console.log(`📊 Book coverage: ${coverage}% (${this.stats.booksFound}/${totalRange})`);
    console.log(`📊 Average books per successful request: ${this.stats.successfulRequests > 0 ? (this.stats.booksFound / this.stats.successfulRequests).toFixed(2) : 0}`);
    
    if (this.stats.booksFound > 0) {
      console.log('🎉 Sequential crawling completed successfully!');
    } else {
      console.log('⚠️ No books found - check URL pattern or website structure');
    }
    
    // Generate 404 analysis
    this.generate404Analysis();
  }

  async generate404Analysis() {
    try {
      const sql = `
        SELECT COUNT(*) as total_404s
        FROM not_found_books
      `;
      
      this.db.get(sql, (err, row) => {
        if (err) {
          console.error('❌ Error generating 404 analysis:', err);
          return;
        }
        
        console.log(`\n📊 === 404 ANALYSIS ===`);
        console.log(`❌ Total 404s: ${row.total_404s}`);
        
        const totalRange = this.settings.endId - this.settings.startId + 1;
        const foundBooks = totalRange - row.total_404s;
        const actualCoverage = ((foundBooks / totalRange) * 100).toFixed(1);
        
        console.log(`📊 Actual book coverage: ${actualCoverage}% (${foundBooks}/${totalRange})`);
        console.log(`📊 404 rate: ${((row.total_404s / totalRange) * 100).toFixed(1)}%`);
      });
      
    } catch (error) {
      console.error('❌ Error generating 404 analysis:', error);
    }
  }
}

// Main execution
async function main() {
  const crawler = new SequentialCrawler();
  
  try {
    const initialized = await crawler.initialize();
    if (initialized) {
      await crawler.crawl();
    } else {
      console.error('❌ Failed to initialize sequential crawler');
    }
  } catch (error) {
    console.error('❌ Main execution failed:', error);
  }
}

// Export for use in other files
module.exports = {
  SequentialCrawler
};

// Run if called directly
if (require.main === module) {
  main();
}
