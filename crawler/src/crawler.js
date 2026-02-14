const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('./config/crawler-config');
const { CREATE_BOOKS_TABLE_SQL } = require('./schema/books-table');
const { CREATE_CRAWL_LOGS_TABLE_SQL } = require('./schema/crawl-logs-table');
const { normalizeDurationForStorage } = require('./utils/duration-parser');
const { validateAudioUrl, filterValidUrls } = require('./utils/url-validator');
const { cleanText } = require('./utils/text-cleaner');
const { validateBookRow } = require('./utils/book-validator');

class GrqaserCrawler {
  constructor() {
    this.baseUrl = config.baseUrl || 'https://grqaser.org';
    this.dbPath = config.dbPath || path.join(__dirname, '../data/grqaser.db');
    this.dataDir = config.dataDir || path.join(__dirname, '../data');
    this.browser = null;
    this.page = null;
    this.db = null;

    const crawling = config.crawling || {};
    this.settings = {
      maxScrolls: crawling.maxScrolls ?? 100,
      targetBooks: crawling.targetBooks ?? 950,
      maxListingPages: crawling.maxListingPages ?? 200,
      delayBetweenScrolls: crawling.delayBetweenScrolls ?? 2000,
      delayBetweenPages: crawling.delayBetweenPages ?? crawling.delayBetweenRequests ?? 1000,
      timeout: crawling.timeout ?? 30000,
      retryAttempts: crawling.retryAttempts ?? 3,
      maxConcurrentUrls: crawling.maxConcurrentUrls ?? 5
    };

    this.loggingConfig = config.logging || {};
    this.logStream = null;

    this.stats = {
      pagesVisited: 0,
      booksFound: 0,
      booksSaved: 0,
      duplicatesSkipped: 0,
      errors: 0,
      urlsProcessed: 0,
      urlsCompleted: 0,
      urlsFailed: 0,
      listingPagesProcessed: 0,
      startTime: Date.now()
    };

    this.seenBooks = new Set();
  }

  async initialize() {
    console.log('🚀 Initializing Grqaser Crawler...');
    
    try {
      // Create data directory
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Initialize database
      await this.initializeDatabase();

      // Create books table if not exists (schema aligned with models/database.js)
      await this.createBooksTableIfNeeded();

      // Create URL queue table
      await this.createUrlQueueTable();

      // Create crawl_logs table for progress/error logging
      await this.createCrawlLogsTableIfNeeded();

      // Optional file logging
      if (this.loggingConfig.file) {
        await this.initFileLogging();
      }

      // Initialize URL queue with starting URLs
      await this.initializeUrlQueue();

      // Launch browser
      await this.launchBrowser();
      
      console.log('✅ [PRODUCTION] Initialization complete');
      return true;
    } catch (error) {
      console.error('❌ [PRODUCTION] Initialization failed:', error);
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

  async createBooksTableIfNeeded() {
    return new Promise((resolve, reject) => {
      this.db.run(CREATE_BOOKS_TABLE_SQL, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async createCrawlLogsTableIfNeeded() {
    return new Promise((resolve, reject) => {
      this.db.run(CREATE_CRAWL_LOGS_TABLE_SQL, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async initFileLogging() {
    const logPath = this.loggingConfig.file;
    if (!logPath) return;
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.logStream = fs.createWriteStream(logPath, { flags: 'a' });
  }

  /**
   * Log progress or error to crawl_logs (and optionally to file). Structured for database-viewer.
   */
  async logCrawl(level, message, bookId = null, url = null, errorDetails = null) {
    return new Promise((resolve) => {
      this.db.run(
        'INSERT INTO crawl_logs (level, message, book_id, url, error_details) VALUES (?, ?, ?, ?, ?)',
        [level, message, bookId, url, errorDetails],
        (err) => {
          if (err) console.error('Failed to write crawl_log:', err);
          if (this.logStream && this.logStream.writable) {
            const line = JSON.stringify({
              ts: new Date().toISOString(),
              level,
              message,
              book_id: bookId,
              url,
              error_details: errorDetails
            }) + '\n';
            this.logStream.write(line);
          }
          resolve();
        }
      );
    });
  }

  async createUrlQueueTable() {
    console.log('🔧 Creating URL queue table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS url_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url VARCHAR(500) NOT NULL,
        url_type VARCHAR(50) NOT NULL, -- 'page', 'book_detail', 'category', 'author'
        priority INTEGER DEFAULT 1, -- Higher number = higher priority
        status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'retry'
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        error_message TEXT,
        books_found INTEGER DEFAULT 0,
        books_saved INTEGER DEFAULT 0,
        processing_started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(url)
      )
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(createTableSQL, (err) => {
        if (err) {
          console.error('❌ Failed to create url_queue table:', err);
          reject(err);
        } else {
          console.log('✅ URL queue table created/verified');
          resolve();
        }
      });
    });
  }

  async initializeUrlQueue() {
    console.log('🔧 Initializing URL queue with starting URLs...');
    
    const startingUrls = [
      { url: '/books', type: 'page', priority: 10 },
      { url: '/books?page=1', type: 'page', priority: 9 },
      { url: '/books?page=2', type: 'page', priority: 8 },
      { url: '/books?page=3', type: 'page', priority: 7 },
      { url: '/books?page=4', type: 'page', priority: 6 },
      { url: '/books?page=5', type: 'page', priority: 5 }
    ];
    
    for (const urlData of startingUrls) {
      await this.addUrlToQueue(urlData.url, urlData.type, urlData.priority);
    }
    
    console.log(`✅ Added ${startingUrls.length} starting URLs to queue`);
  }

  async addUrlToQueue(url, urlType, priority = 1) {
    const sql = `
      INSERT OR IGNORE INTO url_queue (url, url_type, priority, status)
      VALUES (?, ?, ?, 'pending')
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [url, urlType, priority], function(err) {
        if (err) {
          console.error(`❌ Failed to add URL to queue: ${url}`, err);
          reject(err);
        } else {
          if (this.changes > 0) {
            console.log(`✅ Added URL to queue: ${url}`);
          }
          resolve(this.changes > 0);
        }
      });
    });
  }

  async getNextUrlFromQueue() {
    const sql = `
      SELECT * FROM url_queue 
      WHERE status IN ('pending', 'retry') 
      AND retry_count < max_retries
      ORDER BY priority DESC, created_at ASC 
      LIMIT 1
    `;
    
    return new Promise((resolve, reject) => {
      this.db.get(sql, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async updateUrlStatus(urlId, status, errorMessage = null, booksFound = 0, booksSaved = 0) {
    const sql = `
      UPDATE url_queue 
      SET status = ?, 
          error_message = ?, 
          books_found = ?, 
          books_saved = ?,
          updated_at = CURRENT_TIMESTAMP,
          ${status === 'processing' ? 'processing_started_at = CURRENT_TIMESTAMP,' : ''}
          ${status === 'completed' || status === 'failed' ? 'completed_at = CURRENT_TIMESTAMP,' : ''}
          ${status === 'retry' ? 'retry_count = retry_count + 1,' : ''}
          retry_count = CASE WHEN ? = 'retry' THEN retry_count + 1 ELSE retry_count END
      WHERE id = ?
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [status, errorMessage, booksFound, booksSaved, status, urlId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
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
    
    console.log('✅ Browser launched');
  }

  async crawl() {
    console.log('🎯 Starting crawling process with URL queue...');
    console.log(`📊 Target: ${this.settings.targetBooks} quality audiobooks`);
    await this.logCrawl('info', `Crawl started; target=${this.settings.targetBooks}`);

    try {
      await this.loadExistingBooks();
      await this.cleanupEbooks();
      await this.processUrlQueue();
    } catch (error) {
      console.error('❌ Crawling failed:', error);
      this.stats.errors++;
      await this.logCrawl('error', 'Crawl failed', null, null, error.message);
    } finally {
      await this.cleanup();
      this.generateReport();
    }
  }

  async processUrlQueue() {
    console.log('🔧 Processing URL queue...');
    
    while (this.stats.booksSaved < this.settings.targetBooks) {
      const urlData = await this.getNextUrlFromQueue();
      
      if (!urlData) {
        console.log('⚠️ No more URLs in queue, crawling complete');
        break;
      }
      
      console.log(`📄 Processing URL: ${urlData.url} (ID: ${urlData.id})`);
      
      try {
        // Mark as processing
        await this.updateUrlStatus(urlData.id, 'processing');
        this.stats.urlsProcessed++;
        
        // Process the URL based on its type
        const result = await this.processUrl(urlData);
        
        // Mark as completed
        await this.updateUrlStatus(
          urlData.id, 
          'completed', 
          null, 
          result.booksFound, 
          result.booksSaved
        );
        
        this.stats.urlsCompleted++;
        console.log(`✅ Completed URL: ${urlData.url} (Found: ${result.booksFound}, Saved: ${result.booksSaved})`);
        await this.logCrawl('info', `URL completed: ${urlData.url}`, null, urlData.url, `found=${result.booksFound} saved=${result.booksSaved}`);

        if (urlData.url_type === 'page') {
          this.stats.listingPagesProcessed++;
          if (this.stats.listingPagesProcessed < this.settings.maxListingPages) {
            const nextPageUrl = this.getNextPageUrl(urlData.url);
            if (nextPageUrl) {
              await this.addUrlToQueue(nextPageUrl, 'page', urlData.priority - 1);
            }
          }
        }

        if (result.bookUrls && result.bookUrls.length > 0) {
          for (const bookUrl of result.bookUrls) {
            await this.addUrlToQueue(bookUrl, 'book_detail', 5);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing URL ${urlData.url}:`, error);
        await this.logCrawl('error', `URL failed: ${urlData.url}`, null, urlData.url, error.message);

        const shouldRetry = urlData.retry_count < urlData.max_retries;
        const newStatus = shouldRetry ? 'retry' : 'failed';

        await this.updateUrlStatus(
          urlData.id,
          newStatus,
          error.message,
          0,
          0
        );

        if (shouldRetry) {
          console.log(`🔄 Will retry URL: ${urlData.url} (attempt ${urlData.retry_count + 1}/${urlData.max_retries})`);
        } else {
          this.stats.urlsFailed++;
          console.log(`❌ Failed URL permanently: ${urlData.url}`);
        }

        this.stats.errors++;
      }

      await this.page.waitForTimeout(this.settings.delayBetweenPages);
    }
  }

  async processUrl(urlData) {
    const fullUrl = `${this.baseUrl}${urlData.url}`;
    
    try {
      await this.page.goto(fullUrl, { 
        waitUntil: 'networkidle2',
        timeout: this.settings.timeout 
      });
      
      this.stats.pagesVisited++;
      
      // Wait for content to load
      await this.page.waitForTimeout(1000);
      
      let books = [];
      let bookUrls = [];
      
      if (urlData.url_type === 'page') {
        // Extract books from listing page
        books = await this.extractBooksFromPage('audiobook');
        
        // Extract book detail URLs
        bookUrls = await this.extractBookUrls();
        
      } else if (urlData.url_type === 'book_detail') {
        // Extract detailed book information
        const bookDetail = await this.extractBookDetail();
        if (bookDetail) {
          books = [bookDetail];
        }
      }
      
      // Save books
      const savedCount = await this.saveBooks(books);
      
      return {
        booksFound: books.length,
        booksSaved: savedCount,
        bookUrls: bookUrls
      };
      
    } catch (error) {
      throw error;
    }
  }

  getNextPageUrl(currentUrl) {
    const match = currentUrl.match(/page=(\d+)/);
    if (match) {
      const currentPage = parseInt(match[1]);
      const nextPage = currentPage + 1;
      return currentUrl.replace(/page=\d+/, `page=${nextPage}`);
    } else {
      return `${currentUrl}${currentUrl.includes('?') ? '&' : '?'}page=2`;
    }
  }

  async extractBookUrls() {
    try {
      const bookUrls = await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/book/"], a[href*="/books/"]'));
        return links.map(link => {
          const href = link.getAttribute('href');
          return href.startsWith('http') ? href : href;
        }).filter(url => url && !url.includes('#')); // Filter out anchors
      });
      
      // Remove duplicates and normalize URLs
      const uniqueUrls = [...new Set(bookUrls)].map(url => {
        if (url.startsWith('http')) {
          return url.replace(this.baseUrl, '');
        }
        return url;
      });
      
      console.log(`📊 Found ${uniqueUrls.length} book detail URLs`);
      return uniqueUrls;
      
    } catch (error) {
      console.error('❌ Error extracting book URLs:', error);
      return [];
    }
  }

  async extractBookDetail() {
    try {
      const bookData = await this.page.evaluate(() => {
        const titleEl = document.querySelector('h1, .book-title, .title');
        const title = titleEl ? titleEl.textContent.trim() : '';
        let author = document.querySelector('.author, .book-author')?.textContent?.trim() || '';
        if (!author) {
          const allText = document.body.textContent;
          const authorMatch = allText.match(/Հեղինակ:\s*([^()\n]+?)(?:\s*\(|$)/);
          if (authorMatch) author = authorMatch[1].trim();
        }
        let description = document.querySelector('.description, .book-description, .summary')?.textContent?.trim() || '';
        if (!description) {
          const paragraphs = document.querySelectorAll('p');
          for (const p of paragraphs) {
            const text = p.textContent.trim();
            if (text && text.length > 50 && !text.includes('Հեղինակ:') && !text.includes('Կատեգորիա:')) {
              description = text;
              break;
            }
          }
        }
        let duration = document.querySelector('.duration, .book-duration')?.textContent?.trim() || '';
        if (!duration) {
          const durationMatch = document.body.textContent.match(/(\d+ժ\s*\d+ր)/);
          if (durationMatch) duration = durationMatch[1];
        }
        const rating = document.querySelector('.rating, .book-rating')?.textContent?.trim() || null;
        let category = document.querySelector('.category, .book-category')?.textContent?.trim() || '';
        if (!category) {
          const catMatch = document.body.textContent.match(/Կատեգորիա:\s*([^\n]+)/);
          if (catMatch) category = catMatch[1].trim();
        }
        const langEl = document.querySelector('[lang], .language');
        const language = (langEl && langEl.getAttribute('lang')) ? langEl.getAttribute('lang').substring(0, 10) : 'hy';

        let coverImage = null;
        const coverEl = document.querySelector('img[alt="Book Cover"], img[alt*="Cover"], .book-cover img');
        if (coverEl) coverImage = coverEl.src;
        else {
          const pngs = document.querySelectorAll('img[src*=".png"]');
          if (pngs.length > 0) coverImage = pngs[0].src;
        }

        const audioUrls = [];
        document.querySelectorAll('audio source').forEach(s => { if (s.src) audioUrls.push(s.src); });
        document.querySelectorAll('a[href*=".mp3"]').forEach(a => {
          const href = a.href;
          if (href && !href.includes('download-all') && !href.includes('.zip') && !audioUrls.includes(href)) audioUrls.push(href);
        });
        const mainAudio = audioUrls.length > 0 ? audioUrls[0] : null;
        const downloadUrl = document.querySelector('a[href*="download-all"], a[href*=".zip"]')?.href || (audioUrls.length > 1 ? audioUrls[0] : null);

        return {
          title,
          author,
          description,
          duration,
          rating,
          category,
          language,
          coverImage,
          mainAudio,
          downloadUrl,
          audioUrls
        };
      });

      if (!bookData.title) return null;

      const { valid: mainValid } = validateAudioUrl(bookData.mainAudio);
      if (!mainValid || !bookData.mainAudio) {
        console.log(`⏭️ Skipping e-book (no valid audio URL): ${bookData.title}`);
        return null;
      }

      const mainAudioUrl = bookData.mainAudio.trim();
      let downloadUrl = null;
      if (bookData.downloadUrl) {
        const dResult = validateAudioUrl(bookData.downloadUrl);
        if (dResult.valid) downloadUrl = bookData.downloadUrl.trim();
        else console.log(`⚠️ Invalid download_url skipped for ${bookData.title}: ${dResult.error}`);
      }

      const { totalMinutes, formatted: durationFormatted } = normalizeDurationForStorage(bookData.duration || '');

      const id = this.extractBookIdFromUrl(this.page.url());
      const numericId = typeof id === 'string' && /^\d+$/.test(id) ? parseInt(id, 10) : id;

      return {
        id: numericId,
        title: cleanText(bookData.title),
        author: cleanText(bookData.author) || 'Unknown Author',
        description: cleanText(bookData.description || ''),
        duration: totalMinutes,
        duration_formatted: durationFormatted || null,
        type: 'audiobook',
        language: (bookData.language || 'hy').substring(0, 10),
        category: cleanText(bookData.category) || 'Unknown',
        rating: bookData.rating != null ? parseFloat(bookData.rating) : null,
        cover_image_url: mainValid ? (bookData.coverImage || '') : '',
        main_audio_url: mainAudioUrl,
        download_url: downloadUrl,
        crawl_status: 'completed',
        has_chapters: Array.isArray(bookData.audioUrls) && bookData.audioUrls.length > 1,
        chapter_count: Array.isArray(bookData.audioUrls) ? bookData.audioUrls.length : 0
      };
    } catch (error) {
      console.error('❌ Error extracting book detail:', error);
      return null;
    }
  }

  async loadExistingBooks() {
    console.log('🔧 Loading existing books to avoid duplicates...');
    
    return new Promise((resolve, reject) => {
      this.db.all('SELECT title, author FROM books', (err, rows) => {
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

  async cleanupEbooks() {
    console.log('🔧 Cleaning up e-books (books without audio)...');
    
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM books 
        WHERE main_audio_url IS NULL 
        OR main_audio_url = '' 
        OR duration = 0 
        OR duration IS NULL
      `;
      
      this.db.run(sql, function(err) {
        if (err) {
          console.error('❌ Error cleaning up e-books:', err);
          reject(err);
        } else {
          console.log(`✅ Cleaned up ${this.changes} e-books from database`);
          resolve(this.changes);
        }
      });
    });
  }

  async crawlAudiobooks() {
    console.log('🔧 Crawling audiobooks...');
    
    const audiobookUrls = [
      '/books'
    ];
    
    for (const url of audiobookUrls) {
      if (this.stats.booksSaved >= this.settings.targetBooks) {
        console.log('🎉 Target reached, stopping audiobook crawling');
        break;
      }
      
      try {
        await this.crawlCategory(url, 'audiobook');
      } catch (error) {
        console.error(`❌ Error crawling ${url}:`, error);
        this.stats.errors++;
      }
    }
  }

  async crawlEbooks() {
    console.log('🔧 Crawling ebooks...');
    
    // Skip ebooks for now, focus on audiobooks
    console.log('⏭️ Skipping ebooks, focusing on audiobooks');
  }

  async crawlByCategories() {
    console.log('🔧 Crawling by categories...');
    
    // Skip categories for now, focus on main books page
    console.log('⏭️ Skipping categories, focusing on main books page');
  }

  async crawlByAuthors() {
    console.log('🔧 Crawling by popular authors...');
    
    // Skip authors for now, focus on main books page
    console.log('⏭️ Skipping authors, focusing on main books page');
  }

  async crawlCategory(baseUrl, bookType) {
    console.log(`🔧 Crawling category: ${baseUrl}`);
    
    try {
      // Navigate to the main page
      const pageUrl = `${this.baseUrl}${baseUrl}`;
      console.log(`📄 Crawling page: ${pageUrl}`);
      
      await this.page.goto(pageUrl, { 
        waitUntil: 'networkidle2',
        timeout: this.settings.timeout 
      });
      
      this.stats.pagesVisited++;
      
      // Wait for initial content to load
      await this.page.waitForTimeout(2000);
      
      let previousBookCount = 0;
      let noNewBooksCount = 0;
      const maxNoNewBooks = 5; // Stop if no new books found after 5 scrolls
      
      // Scroll and extract books until we reach target or no new books
      for (let scroll = 1; scroll <= this.settings.maxScrolls; scroll++) {
        if (this.stats.booksSaved >= this.settings.targetBooks) {
          console.log('🎉 Target reached, stopping scrolling');
          break;
        }
        
        console.log(`📜 Scroll ${scroll}: Loading more books...`);
        
        // Scroll down to trigger infinite loading
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        // Wait for new content to load
        await this.page.waitForTimeout(2000);
        
        // Extract books from current page state
        const books = await this.extractBooksFromPage(bookType);
        
        console.log(`📊 Found ${books.length} total books on page after scroll ${scroll}`);
        
        // Save books
        await this.saveBooks(books);
        
        // Check if we found new books
        const currentBookCount = this.stats.booksSaved;
        const newBooks = currentBookCount - previousBookCount;
        
        if (newBooks === 0) {
          noNewBooksCount++;
          console.log(`⚠️ No new books found on scroll ${scroll} (${noNewBooksCount}/${maxNoNewBooks})`);
          
          if (noNewBooksCount >= maxNoNewBooks) {
            console.log(`🛑 No new books found after ${maxNoNewBooks} scrolls, stopping`);
            break;
          }
        } else {
          noNewBooksCount = 0; // Reset counter if we found new books
          console.log(`✅ Found ${newBooks} new books on scroll ${scroll}`);
        }
        
        previousBookCount = currentBookCount;
        
        // Wait between scrolls
        await this.page.waitForTimeout(this.settings.delayBetweenScrolls);
      }
      
    } catch (error) {
      console.error(`❌ Error crawling ${baseUrl}:`, error);
      this.stats.errors++;
    }
  }

  async extractBooksFromPage(bookType) {
    try {
      // Try multiple selectors to find books
      const selectors = [
        '.book-item',
        '.book-card', 
        '.book',
        '[class*="book"]',
        '.item',
        '.card'
      ];
      
      let books = [];
      
      for (const selector of selectors) {
        const elements = await this.page.$$(selector);
        
        if (elements.length > 0) {
          console.log(`📊 [PRODUCTION] Found ${elements.length} elements with selector: ${selector}`);
          books = await this.extractBooksFromElements(elements, bookType);
          break;
        }
      }
      
      return books;
      
    } catch (error) {
      console.error('❌ [PRODUCTION] Book extraction failed:', error);
      return [];
    }
  }

  async extractBooksFromElements(elements, bookType) {
    const books = [];
    
    for (let i = 0; i < elements.length; i++) {
      try {
        const element = elements[i];
        const bookData = await this.extractBookData(element, i, bookType);
        
        if (bookData && this.isValidBook(bookData)) {
          books.push(bookData);
        }
        
      } catch (error) {
        console.error(`❌ [PRODUCTION] Error extracting element ${i + 1}:`, error);
        this.stats.errors++;
      }
    }
    
    return books;
  }

  async extractBookData(element, index, bookType) {
    try {
      // Extract title
      const titleElement = await element.$('h3, h4, .title, [class*="title"]');
      const title = titleElement ? await titleElement.evaluate(el => el.textContent.trim()) : null;
      
      // Skip if no title or generic title
      if (!title || title.startsWith('Book ') || title.length < 3) {
        return null;
      }
      
      // Extract author
      const authorElement = await element.$('.author, [class*="author"]');
      const author = authorElement ? await authorElement.evaluate(el => el.textContent.trim()) : 'Unknown Author';
      
      // Extract duration
      const durationElement = await element.$('.duration, [class*="duration"], .time');
      const duration = durationElement ? await element.evaluate(el => el.textContent.trim()) : '';
      
      // Extract cover image
      const imageElement = await element.$('img');
      const coverImageUrl = imageElement ? await imageElement.evaluate(el => el.src) : '';
      
      // Extract link
      const linkElement = await element.$('a');
      const link = linkElement ? await linkElement.evaluate(el => el.href) : '';
      
      // Extract book ID from URL
      const bookId = link ? this.extractBookIdFromUrl(link) : `book_${Date.now()}_${index}`;
      
      return {
        id: bookId,
        title: title,
        author: author,
        duration: duration,
        cover_image_url: coverImageUrl,
        link: link,
        type: bookType
      };
      
    } catch (error) {
      console.error(`❌ [PRODUCTION] Error extracting book data for element ${index}:`, error);
      return null;
    }
  }

  isValidBook(book) {
    // Check if book has valid title
    if (!book.title || book.title.length < 3) {
      return false;
    }
    
    // Skip e-books (books without audio/duration) - only keep audiobooks
    if (!book.duration || book.duration === '' || book.duration === '0' || book.duration === 0) {
      console.log(`⏭️ Skipping e-book (no audio): ${book.title}`);
      return false;
    }
    
    // Check if book is already seen
    const key = `${book.title}|${book.author}`;
    if (this.seenBooks.has(key)) {
      this.stats.duplicatesSkipped++;
      return false;
    }
    
    // Mark as seen
    this.seenBooks.add(key);
    
    return true;
  }

  extractBookIdFromUrl(url) {
    try {
      const match = url.match(/\/(\d+)(?:\/|$)/);
      return match ? parseInt(match[1]) : `book_${Date.now()}`;
    } catch (error) {
      return `book_${Date.now()}`;
    }
  }

  normalizeBookForSave(book) {
    const b = { ...book };
    if (typeof b.duration === 'string' && b.duration_formatted == null) {
      const norm = normalizeDurationForStorage(b.duration);
      b.duration = norm.totalMinutes;
      b.duration_formatted = norm.formatted || null;
    }
    if (b.title != null) b.title = cleanText(String(b.title));
    if (b.author != null) b.author = cleanText(String(b.author)) || 'Unknown Author';
    if (b.description != null) b.description = cleanText(String(b.description));
    if (b.category != null) b.category = cleanText(String(b.category)) || 'Unknown';
    return b;
  }

  async saveBooks(books) {
    console.log(`🔧 [PRODUCTION] Saving ${books.length} books...`);

    let savedCount = 0;

    for (const book of books) {
      try {
        const normalized = this.normalizeBookForSave(book);
        const validation = validateBookRow(normalized);
        if (!validation.valid) {
          console.warn(`⚠️ Skipping invalid book "${normalized.title}":`, validation.errors);
          continue;
        }
        const saved = await this.saveBookToDatabase(normalized);
        if (saved) {
          savedCount++;
          this.stats.booksSaved++;
          this.stats.booksFound++;
        }
      } catch (error) {
        console.error(`❌ [PRODUCTION] Error saving book "${book.title}":`, error);
        this.stats.errors++;
      }
    }

    console.log(`📊 [PRODUCTION] Saved ${savedCount}/${books.length} books`);
    console.log(`📊 [PRODUCTION] Total books saved: ${this.stats.booksSaved}`);

    return savedCount;
  }

  async saveBookToDatabase(book) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO books (
          id, title, author, description, duration, duration_formatted, type, language, category,
          rating, rating_count, cover_image_url, main_audio_url, download_url,
          file_size, published_at, crawl_status, has_chapters, chapter_count, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      const params = [
        book.id,
        book.title,
        book.author,
        book.description ?? '',
        book.duration ?? null,
        book.duration_formatted ?? null,
        book.type || 'audiobook',
        book.language || 'hy',
        book.category || 'Unknown',
        book.rating ?? null,
        book.rating_count ?? null,
        book.cover_image_url ?? null,
        book.main_audio_url ?? null,
        book.download_url ?? null,
        book.file_size ?? null,
        book.published_at ?? null,
        book.crawl_status || 'completed',
        book.has_chapters ? 1 : 0,
        book.chapter_count ?? 0
      ];
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  async cleanup() {
    console.log('🔧 [PRODUCTION] Cleaning up...');
    if (this.logStream && this.logStream.writable) {
      this.logStream.end();
      this.logStream = null;
    }
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
    
    console.log('\n📊 === URL QUEUE CRAWLER REPORT ===');
    console.log(`⏱️  Duration: ${durationMinutes} minutes`);
    console.log(`📄 Pages visited: ${this.stats.pagesVisited}`);
    console.log(`📖 Books found: ${this.stats.booksFound}`);
    console.log(`💾 Books saved: ${this.stats.booksSaved}`);
    console.log(`🔄 Duplicates skipped: ${this.stats.duplicatesSkipped}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`📊 Success rate: ${this.stats.booksFound > 0 ? ((this.stats.booksSaved / this.stats.booksFound) * 100).toFixed(1) : 0}%`);
    
    console.log('\n🔗 === URL QUEUE STATISTICS ===');
    console.log(`📋 URLs processed: ${this.stats.urlsProcessed}`);
    console.log(`✅ URLs completed: ${this.stats.urlsCompleted}`);
    console.log(`❌ URLs failed: ${this.stats.urlsFailed}`);
    console.log(`📊 URL success rate: ${this.stats.urlsProcessed > 0 ? ((this.stats.urlsCompleted / this.stats.urlsProcessed) * 100).toFixed(1) : 0}%`);
    
    console.log('\n🎯 === TARGET STATUS ===');
    console.log(`Target: ${this.settings.targetBooks} books`);
    console.log(`Achieved: ${this.stats.booksSaved} books`);
    console.log(`Progress: ${((this.stats.booksSaved / this.settings.targetBooks) * 100).toFixed(1)}%`);
    
    if (this.stats.booksSaved >= this.settings.targetBooks) {
      console.log('🎉 TARGET ACHIEVED!');
    } else {
      console.log('⚠️ Target not reached - consider running again');
    }
    
    // Generate URL queue summary
    this.generateUrlQueueSummary();
  }

  async generateUrlQueueSummary() {
    try {
      const sql = `
        SELECT 
          status,
          COUNT(*) as count,
          SUM(books_found) as total_books_found,
          SUM(books_saved) as total_books_saved,
          AVG(books_found) as avg_books_found
        FROM url_queue 
        GROUP BY status
        ORDER BY count DESC
      `;
      
      this.db.all(sql, (err, rows) => {
        if (err) {
          console.error('❌ Error generating URL queue summary:', err);
          return;
        }
        
        console.log('\n📋 === URL QUEUE DETAILED SUMMARY ===');
        for (const row of rows) {
          console.log(`${row.status.toUpperCase()}: ${row.count} URLs`);
          if (row.total_books_found > 0) {
            console.log(`  📖 Books found: ${row.total_books_found} (avg: ${row.avg_books_found.toFixed(1)})`);
          }
          if (row.total_books_saved > 0) {
            console.log(`  💾 Books saved: ${row.total_books_saved}`);
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error generating URL queue summary:', error);
    }
  }
}

// Main execution
async function main() {
  const crawler = new GrqaserCrawler();
  
  try {
    const initialized = await crawler.initialize();
    if (initialized) {
      await crawler.crawl();
    } else {
      console.error('❌ Failed to initialize crawler');
    }
  } catch (error) {
    console.error('❌ Main execution failed:', error);
  }
}

// Export for use in other files
module.exports = {
  GrqaserCrawler
};

// Run if called directly
if (require.main === module) {
  main();
}
