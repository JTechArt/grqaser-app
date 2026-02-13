/**
 * Full Database Crawler
 * 
 * This crawler processes all books in the database efficiently:
 * - Only processes books that haven't been successfully crawled with the new logic
 * - Updates existing books with new data (upsert)
 * - Marks successful crawls to avoid reprocessing
 */

const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database-viewer/data/grqaser.db');

class FullDatabaseCrawler {
  constructor() {
    this.browser = null;
    this.page = null;
    this.db = null;
    this.batchSize = 10;
    this.delayBetweenRequests = 1000; // 1 second
    this.maxConcurrent = 3; // Process 3 books concurrently
    this.stats = {
      total: 0,
      processed: 0,
      updated: 0,
      errors: 0,
      skipped: 0
    };
  }

  async init() {
    console.log('🚀 Initializing Full Database Crawler...');
    
    // Connect to database
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Database connection error:', err);
        throw err;
      }
      console.log('✅ Connected to main database');
    });

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: true, // Use old headless mode for stability
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    // Create multiple pages for concurrent processing
    this.pages = [];
    for (let i = 0; i < this.maxConcurrent; i++) {
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      this.pages.push(page);
    }
    
    console.log(`✅ Full Database Crawler initialized with ${this.maxConcurrent} concurrent pages`);
  }

  async getBooksToProcess() {
    return new Promise((resolve, reject) => {
      // Get books that need processing:
      // 1. Books with download-all URLs
      // 2. Books without chapter_urls
      // 3. Books with crawl_status != 'completed' or crawl_status IS NULL
      const sql = `
        SELECT id, title, author, description, duration, cover_image_url, 
               main_audio_url, chapter_urls, crawl_status, created_at, updated_at
        FROM books 
        WHERE main_audio_url LIKE '%download-all%' 
           OR chapter_urls IS NULL 
           OR crawl_status != 'completed' 
           OR crawl_status IS NULL
        ORDER BY id
      `;
      
      this.db.all(sql, (err, rows) => {
        if (err) {
          console.error('❌ Error getting books to process:', err);
          reject(err);
          return;
        }
        this.stats.total = rows.length;
        console.log(`📚 Found ${rows.length} books to process`);
        resolve(rows);
      });
    });
  }

  async extractBookDetails(url, originalBook, pageIndex) {
    const page = this.pages[pageIndex];
    
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for content to load
      await page.waitForTimeout(2000);

      const bookData = await page.evaluate(() => {
        const titleElement = document.querySelector('h1');
        const title = titleElement ? titleElement.textContent.trim() : '';

        let author = 'Unknown Author';
        const allText = document.body.textContent;
        const authorMatch = allText.match(/Հեղինակ:\s*([^()\n]+?)(?:\s*\(|$)/);
        if (authorMatch) {
          author = authorMatch[1].trim();
        }

        let description = '';
        const paragraphs = document.querySelectorAll('p');
        for (const p of paragraphs) {
          const text = p.textContent.trim();
          if (text && text.length > 50 && !text.includes('Հեղինակ:') && !text.includes('Ընթերցող:') && !text.includes('Կատեգորիա:')) {
            description = text;
            break;
          }
        }

        let duration = '';
        const durationMatch = allText.match(/(\d+ժ\s*\d+ր)/);
        if (durationMatch) {
          duration = durationMatch[1];
        }

        // Find cover image
        const coverElement = document.querySelector('img[alt="Book Cover"]') || 
                           document.querySelector('img[alt*="cover"]') ||
                           document.querySelector('img[alt*="Cover"]') ||
                           document.querySelector('.book-cover img') ||
                           document.querySelector('.cover img') ||
                           document.querySelector('img[src*="cover"]') ||
                           document.querySelector('img[src*="Cover"]');
        const coverImageUrl = coverElement ? coverElement.src : '';

        // Extract individual MP3 URLs - comprehensive approach
        const audioUrls = [];
        
        // Method 1: Look for audio elements
        document.querySelectorAll('audio source').forEach(audio => {
          if (audio.src && audio.src.includes('.mp3')) {
            audioUrls.push(audio.src);
          }
        });

        // Method 2: Look for links with .mp3 extension (excluding download-all and .zip)
        document.querySelectorAll('a[href*=".mp3"]').forEach(link => {
          const href = link.href;
          if (href && !href.includes('download-all') && !href.includes('.zip') && !audioUrls.includes(href)) {
            audioUrls.push(href);
          }
        });

        // Method 3: Look for media.grqaser.org links with .mp3
        document.querySelectorAll('a[href*="media.grqaser.org"]').forEach(link => {
          const href = link.href;
          if (href && href.includes('.mp3') && !href.includes('download-all') && !href.includes('.zip') && !audioUrls.includes(href)) {
            audioUrls.push(href);
          }
        });

        // Method 4: Parse page source for MP3 URLs
        const pageSource = document.documentElement.outerHTML;
        const mp3UrlMatches = pageSource.match(/https:\/\/media\.grqaser\.org\/[^"'\s]+\.mp3/g);
        if (mp3UrlMatches) {
          mp3UrlMatches.forEach(url => {
            if (!url.includes('download-all') && !url.includes('.zip') && !audioUrls.includes(url)) {
              audioUrls.push(url);
            }
          });
        }

        // Method 5: Look for numbered MP3 files (001_, 002_, etc.)
        const numberedMp3Matches = pageSource.match(/https:\/\/media\.grqaser\.org\/[^"'\s]+\/\d{3}_[^"'\s]+\.mp3/g);
        if (numberedMp3Matches) {
          numberedMp3Matches.forEach(url => {
            if (!audioUrls.includes(url)) {
              audioUrls.push(url);
            }
          });
        }

        return {
          title,
          author,
          description,
          duration,
          coverImageUrl,
          audioUrls: [...new Set(audioUrls)] // Remove duplicates
        };
      });

      // Update the original book with extracted data
      const updatedBook = {
        ...originalBook,
        title: bookData.title || originalBook.title,
        author: bookData.author,
        description: bookData.description || originalBook.description,
        duration: bookData.duration || originalBook.duration,
        cover_image_url: bookData.coverImageUrl || originalBook.cover_image_url,
        main_audio_url: bookData.audioUrls.length > 0 ? bookData.audioUrls[0] : '',
        chapter_urls: bookData.audioUrls.length > 0 ? JSON.stringify(bookData.audioUrls) : null,
        has_chapters: bookData.audioUrls.length > 1,
        chapter_count: bookData.audioUrls.length,
        crawl_status: 'completed',
        updated_at: new Date().toISOString()
      };

      return updatedBook;

    } catch (error) {
      console.error(`❌ Error processing book ${originalBook.id}:`, error.message);
      return {
        ...originalBook,
        crawl_status: 'error',
        updated_at: new Date().toISOString()
      };
    }
  }

  async updateBook(book) {
    const sql = `
      UPDATE books SET
        title = ?, author = ?, description = ?, duration = ?,
        cover_image_url = ?, main_audio_url = ?, chapter_urls = ?,
        has_chapters = ?, chapter_count = ?, crawl_status = ?, updated_at = ?
      WHERE id = ?
    `;
    
    const params = [
      book.title,
      book.author,
      book.description,
      book.duration,
      book.cover_image_url,
      book.main_audio_url,
      book.chapter_urls,
      book.has_chapters,
      book.chapter_count,
      book.crawl_status,
      book.updated_at,
      book.id
    ];

    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Error updating book:', err);
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async processBookBatch(books, startIndex) {
    const promises = [];
    
    for (let i = 0; i < this.maxConcurrent && startIndex + i < books.length; i++) {
      const book = books[startIndex + i];
      const pageIndex = i;
      
      const promise = this.processBook(book, pageIndex);
      promises.push(promise);
    }
    
    await Promise.all(promises);
  }

  async processBook(book, pageIndex) {
    try {
      console.log(`🔍 Processing book ID: ${book.id} - ${book.title}`);
      
      const url = `https://grqaser.org/books/${book.id}`;
      const updatedBook = await this.extractBookDetails(url, book, pageIndex);
      
      if (updatedBook.crawl_status === 'completed') {
        await this.updateBook(updatedBook);
        this.stats.updated++;
        
        if (updatedBook.chapter_count > 0) {
          console.log(`✅ Updated book ${book.id}: ${updatedBook.chapter_count} MP3 files found`);
        } else {
          console.log(`✅ Updated book ${book.id}: No MP3 files found`);
        }
      } else {
        this.stats.errors++;
        console.log(`❌ Book ${book.id} failed to process`);
      }
      
      this.stats.processed++;
      
    } catch (error) {
      console.error(`❌ Error processing book ${book.id}:`, error);
      this.stats.errors++;
      this.stats.processed++;
    }
  }

  async processBooks() {
    try {
      const books = await this.getBooksToProcess();
      
      if (books.length === 0) {
        console.log('🎉 No books need processing!');
        return;
      }

      const startTime = Date.now();
      
      // Process books in batches
      for (let i = 0; i < books.length; i += this.maxConcurrent) {
        console.log(`\n🔄 Processing batch ${Math.floor(i / this.maxConcurrent) + 1}/${Math.ceil(books.length / this.maxConcurrent)}`);
        
        await this.processBookBatch(books, i);
        
        // Progress update
        const progress = ((i + this.maxConcurrent) / books.length * 100).toFixed(1);
        console.log(`📊 Progress: ${progress}% (${Math.min(i + this.maxConcurrent, books.length)}/${books.length})`);
        
        // Small delay between batches
        if (i + this.maxConcurrent < books.length) {
          await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests));
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.log('\n🎉 Processing completed!');
      console.log(`📊 Final Statistics:`);
      console.log(`   - Total books: ${this.stats.total}`);
      console.log(`   - Processed: ${this.stats.processed}`);
      console.log(`   - Updated: ${this.stats.updated}`);
      console.log(`   - Errors: ${this.stats.errors}`);
      console.log(`   - Duration: ${duration}s`);

    } catch (error) {
      console.error('❌ Error processing books:', error);
    }
  }

  async cleanup() {
    if (this.pages) {
      for (const page of this.pages) {
        await page.close();
      }
    }
    if (this.browser) {
      await this.browser.close();
    }
    if (this.db) {
      this.db.close();
    }
    console.log('🧹 Full Database Crawler cleaned up');
  }
}

// Run the crawler
async function main() {
  const crawler = new FullDatabaseCrawler();
  
  try {
    await crawler.init();
    await crawler.processBooks();
  } catch (error) {
    console.error('❌ Crawler error:', error);
  } finally {
    await crawler.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = FullDatabaseCrawler;
