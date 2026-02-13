const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class SmartSequentialCrawler {
  constructor() {
    this.baseUrl = 'https://grqaser.org';
    this.dbPath = path.join(__dirname, '../data/grqaser.db');
    this.dataDir = path.join(__dirname, '../data');
    this.browser = null;
    this.page = null;
    this.db = null;
    
    // Smart crawling settings
    this.settings = {
      delayBetweenRequests: 1000, // 1 second between requests
      timeout: 15000, // 15 seconds timeout per page
      retryAttempts: 3,
      maxConcurrentRequests: 1, // Sequential processing
      save404s: true, // Save 404 responses for analysis
      batchSize: 50, // Process in batches for better monitoring
      autoRetryFailed: true // Automatically retry failed links
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
      currentId: 0,
      batchNumber: 0
    };
    
    // Track seen books to avoid duplicates
    this.seenBooks = new Set();
  }

  async initialize() {
    console.log('🚀 Initializing Smart Sequential Crawler...');
    
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
      
      console.log('✅ Smart sequential crawler initialization complete');
      return true;
    } catch (error) {
      console.error('❌ Smart sequential crawler initialization failed:', error);
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

  async loadExistingBooks() {
    console.log('📚 Loading existing books from database...');
    
    return new Promise((resolve, reject) => {
      this.db.all('SELECT id, title, author FROM books', (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        rows.forEach(book => {
          this.seenBooks.add(book.id);
        });
        
        console.log(`   Loaded ${rows.length} existing books`);
        resolve();
      });
    });
  }

  async launchBrowser() {
    console.log('🌐 Launching browser...');
    
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
    
    // Set user agent
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set viewport
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    console.log('✅ Browser launched');
  }

  async getNextNewLink() {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT * FROM crawl_links 
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

  async updateLinkStatus(bookId, status, errorMessage = null, booksFound = 0, booksSaved = 0) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      const completedAt = status === 'SUCCESS' || status === 'FAILED' ? now : null;
      
      this.db.run(`
        UPDATE crawl_links 
        SET status = ?, 
            error_message = ?, 
            books_found = ?, 
            books_saved = ?, 
            completed_at = ?,
            updated_at = ?
        WHERE book_id = ?
      `, [status, errorMessage, booksFound, booksSaved, completedAt, now, bookId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async markLinkInProgress(bookId) {
    return this.updateLinkStatus(bookId, 'IN_PROGRESS');
  }

  async markLinkSuccess(bookId, booksFound = 1, booksSaved = 1) {
    return this.updateLinkStatus(bookId, 'SUCCESS', null, booksFound, booksSaved);
  }

  async markLinkFailed(bookId, errorMessage) {
    return this.updateLinkStatus(bookId, 'FAILED', errorMessage);
  }

  async extractBookData(page) {
    try {
      const bookData = await page.evaluate(() => {
        // Multiple selectors for robust extraction
        const selectors = {
          title: ['h1', '.book-title', '.title', '[data-testid="book-title"]'],
          author: ['.author', '.book-author', '.writer', '[data-testid="book-author"]'],
          description: ['.description', '.book-description', '.summary', '[data-testid="book-description"]'],
          duration: ['.duration', '.book-duration', '.time', '[data-testid="book-duration"]'],
          rating: ['.rating', '.book-rating', '.stars', '[data-testid="book-rating"]'],
          coverImage: ['.book-cover img', '.cover img', '[data-testid="book-cover"] img'],
          audioUrl: ['audio source', '.audio-player source', '[data-testid="audio-source"]']
        };

        const extractValue = (selectorArray) => {
          for (const selector of selectorArray) {
            const element = document.querySelector(selector);
            if (element) {
              if (element.tagName === 'IMG') {
                return element.src;
              } else if (element.tagName === 'SOURCE') {
                return element.src;
              } else {
                return element.textContent.trim();
              }
            }
          }
          return null;
        };

        return {
          title: extractValue(selectors.title),
          author: extractValue(selectors.author),
          description: extractValue(selectors.description),
          duration: extractValue(selectors.duration),
          rating: extractValue(selectors.rating),
          coverImageUrl: extractValue(selectors.coverImage),
          audioUrl: extractValue(selectors.audioUrl)
        };
      });

      return bookData;
    } catch (error) {
      console.error('Error extracting book data:', error);
      return null;
    }
  }

  async saveBookToDatabase(bookId, bookData) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      // Check if book already exists
      this.db.get('SELECT id FROM books WHERE id = ?', [bookId], (err, existingBook) => {
        if (err) {
          reject(err);
          return;
        }

        if (existingBook) {
          // Update existing book
          this.db.run(`
            UPDATE books 
            SET title = ?, author = ?, description = ?, duration = ?, 
                cover_image_url = ?, main_audio_url = ?, rating = ?,
                crawl_status = 'completed', updated_at = ?
            WHERE id = ?
          `, [
            bookData.title || 'Unknown Title',
            bookData.author || 'Unknown Author',
            bookData.description || '',
            bookData.duration || '',
            bookData.coverImageUrl || '',
            bookData.audioUrl || '',
            bookData.rating || null,
            now,
            bookId
          ], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(true); // Updated
            }
          });
        } else {
          // Insert new book
          this.db.run(`
            INSERT INTO books (
              id, title, author, description, duration, cover_image_url, 
              main_audio_url, rating, type, crawl_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'audiobook', 'completed', ?, ?)
          `, [
            bookId,
            bookData.title || 'Unknown Title',
            bookData.author || 'Unknown Author',
            bookData.description || '',
            bookData.duration || '',
            bookData.coverImageUrl || '',
            bookData.audioUrl || '',
            bookData.rating || null,
            now,
            now
          ], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(false); // Inserted
            }
          });
        }
      });
    });
  }

  async crawlBook(bookId, url) {
    try {
      console.log(`📖 Crawling book ID ${bookId}: ${url}`);
      
      // Mark as in progress
      await this.markLinkInProgress(bookId);
      
      // Navigate to page
      await this.page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: this.settings.timeout 
      });
      
      // Check if page exists (not 404)
      const is404 = await this.page.evaluate(() => {
        return document.title.includes('404') || 
               document.body.textContent.includes('404') ||
               document.querySelector('.error-404') !== null;
      });
      
      if (is404) {
        console.log(`   ❌ 404 - Book not found`);
        await this.markLinkFailed(bookId, '404 - Book not found');
        return { success: false, reason: '404' };
      }
      
      // Extract book data
      const bookData = await this.extractBookData(this.page);
      
      if (!bookData || !bookData.title) {
        console.log(`   ❌ Failed to extract book data`);
        await this.markLinkFailed(bookId, 'Failed to extract book data');
        return { success: false, reason: 'extraction_failed' };
      }
      
      // Save to database
      const wasUpdated = await this.saveBookToDatabase(bookId, bookData);
      
      // Mark as success
      await this.markLinkSuccess(bookId);
      
      console.log(`   ✅ ${wasUpdated ? 'Updated' : 'Saved'}: ${bookData.title} by ${bookData.author}`);
      
      return { success: true, wasUpdated };
      
    } catch (error) {
      console.error(`   ❌ Error crawling book ${bookId}:`, error.message);
      await this.markLinkFailed(bookId, error.message);
      return { success: false, reason: 'error', error: error.message };
    }
  }

  async processBatch() {
    console.log(`\n📦 Processing batch ${++this.stats.batchNumber}...`);
    
    let batchCount = 0;
    const batchStartTime = Date.now();
    
    while (batchCount < this.settings.batchSize) {
      // Get next NEW link
      const link = await this.getNextNewLink();
      
      if (!link) {
        console.log('   ✅ No more NEW links to process');
        break;
      }
      
      // Crawl the book
      const result = await this.crawlBook(link.book_id, link.url);
      
      // Update statistics
      this.stats.totalRequests++;
      if (result.success) {
        this.stats.successfulRequests++;
        this.stats.booksFound++;
        this.stats.booksSaved++;
      } else {
        this.stats.failedRequests++;
        this.stats.errors++;
      }
      
      batchCount++;
      
      // Progress update
      if (batchCount % 10 === 0) {
        const elapsed = (Date.now() - batchStartTime) / 1000;
        const rate = batchCount / elapsed;
        console.log(`   📊 Batch progress: ${batchCount}/${this.settings.batchSize} (${rate.toFixed(2)}/sec)`);
      }
      
      // Delay between requests
      if (batchCount < this.settings.batchSize) {
        await new Promise(resolve => setTimeout(resolve, this.settings.delayBetweenRequests));
      }
    }
    
    const batchTime = (Date.now() - batchStartTime) / 1000;
    console.log(`   ✅ Batch ${this.stats.batchNumber} completed: ${batchCount} books in ${batchTime.toFixed(1)}s`);
    
    return batchCount;
  }

  async showProgress() {
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
          return;
        }
        
        const totalTime = (Date.now() - this.stats.startTime) / 1000;
        const rate = this.stats.totalRequests / totalTime;
        
        console.log('\n📊 === CRAWL PROGRESS ===');
        console.log(`⏱️  Total time: ${(totalTime / 60).toFixed(1)} minutes`);
        console.log(`🚀 Rate: ${rate.toFixed(2)} requests/second`);
        console.log(`📖 Total requests: ${this.stats.totalRequests}`);
        console.log(`✅ Successful: ${this.stats.successfulRequests}`);
        console.log(`❌ Failed: ${this.stats.failedRequests}`);
        console.log(`📚 Books found: ${this.stats.booksFound}`);
        console.log(`💾 Books saved: ${this.stats.booksSaved}`);
        
        console.log('\n📋 Status breakdown:');
        rows.forEach(row => {
          console.log(`   ${row.status}: ${row.count} links`);
        });
        
        resolve();
      });
    });
  }

  async crawl() {
    console.log('🚀 Starting smart sequential crawling...');
    
    try {
      let totalProcessed = 0;
      
      while (true) {
        // Check if there are any NEW links
        const newLink = await this.getNextNewLink();
        if (!newLink) {
          console.log('\n✅ No more NEW links to process. Crawling completed!');
          break;
        }
        
        // Process batch
        const batchCount = await this.processBatch();
        totalProcessed += batchCount;
        
        // Show progress
        await this.showProgress();
        
        // Check if we should continue
        if (batchCount === 0) {
          break;
        }
      }
      
      console.log(`\n🎉 Crawling completed! Total processed: ${totalProcessed} books`);
      
    } catch (error) {
      console.error('❌ Crawling failed:', error);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
      if (this.db) {
        this.db.close();
      }
    }
  }

  async run() {
    const initialized = await this.initialize();
    if (!initialized) {
      console.error('❌ Failed to initialize crawler');
      return;
    }
    
    await this.crawl();
  }
}

// CLI interface
if (require.main === module) {
  const crawler = new SmartSequentialCrawler();
  crawler.run().catch(console.error);
}

module.exports = SmartSequentialCrawler;
