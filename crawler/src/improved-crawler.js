/**
 * Improved Crawler for Grqaser.org
 * Updates existing books with proper audio URLs and cover images
 */

const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class ImprovedCrawler {
  constructor() {
    this.baseUrl = 'https://grqaser.org';
    this.dbPath = path.join(__dirname, '../../database-viewer/data/grqaser.db');
    this.browser = null;
    this.page = null;
    this.db = null;
    
    // Settings
    this.settings = {
      maxBooks: 50, // Process 50 books at a time
      timeout: 30000,
      delayBetweenRequests: 2000,
      retryAttempts: 3,
      batchSize: 10
    };
    
    // Statistics
    this.stats = {
      booksProcessed: 0,
      booksUpdated: 0,
      booksWithAudio: 0,
      booksWithCover: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  async initialize() {
    console.log('🚀 Initializing Improved Crawler...');
    
    // Connect to main database
    await this.initializeDatabase();
    
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
    
    this.page = await this.browser.newPage();
    
    // Set user agent
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('✅ Improved Crawler initialized');
  }

  async initializeDatabase() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Database connection error:', err);
          reject(err);
          return;
        }
        console.log('✅ Connected to main database');
        resolve();
      });
    });
  }

  async run() {
    try {
      await this.initialize();
      
      // Get books that need updating (those without audio URLs)
      const booksToUpdate = await this.getBooksToUpdate();
      console.log(`📚 Found ${booksToUpdate.length} books to update`);
      
      // Process books in batches
      for (let i = 0; i < booksToUpdate.length; i += this.settings.batchSize) {
        const batch = booksToUpdate.slice(i, i + this.settings.batchSize);
        console.log(`\n🔄 Processing batch ${Math.floor(i/this.settings.batchSize) + 1}/${Math.ceil(booksToUpdate.length/this.settings.batchSize)}`);
        
        for (const book of batch) {
          console.log(`\n🔍 Processing book ID: ${book.id} - ${book.title}`);
          
          try {
            const bookUrl = `${this.baseUrl}/books/${book.id}`;
            console.log(`📍 URL: ${bookUrl}`);
            
            const updatedBook = await this.extractBookDetails(bookUrl, book);
            
            if (updatedBook) {
              await this.updateBook(updatedBook);
              this.stats.booksProcessed++;
              this.stats.booksUpdated++;
              
              if (updatedBook.main_audio_url) {
                this.stats.booksWithAudio++;
                console.log(`✅ Audio URL found: ${updatedBook.main_audio_url}`);
              }
              
              if (updatedBook.cover_image_url) {
                this.stats.booksWithCover++;
                console.log(`✅ Cover image found: ${updatedBook.cover_image_url}`);
              }
            }
            
            // Delay between requests
            await this.delay(this.settings.delayBetweenRequests);
            
          } catch (error) {
            console.error(`❌ Error processing book ${book.id}:`, error.message);
            this.stats.errors++;
          }
          
          if (this.stats.booksProcessed >= this.settings.maxBooks) {
            console.log(`\n⏹️ Reached maximum books limit (${this.settings.maxBooks})`);
            break;
          }
        }
        
        if (this.stats.booksProcessed >= this.settings.maxBooks) {
          break;
        }
      }
      
      await this.printStats();
      
    } catch (error) {
      console.error('❌ Improved crawler error:', error);
    } finally {
      await this.cleanup();
    }
  }

  async getBooksToUpdate() {
    // Get books that don't have audio URLs or have "Unknown Author"
    const sql = `
      SELECT id, title, author, duration, main_audio_url, cover_image_url 
      FROM books 
      WHERE (main_audio_url IS NULL OR main_audio_url = '') 
         OR author = 'Unknown Author'
         OR (cover_image_url IS NULL OR cover_image_url = '')
      ORDER BY id
      LIMIT ?
    `;
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, [this.settings.maxBooks], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  async extractBookDetails(url, originalBook) {
    try {
      await this.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: this.settings.timeout 
      });
      
      // Wait for content to load
      await this.page.waitForTimeout(2000);
      
      const bookData = await this.page.evaluate(() => {
        // Extract title
        const titleElement = document.querySelector('h1');
        const title = titleElement ? titleElement.textContent.trim() : '';
        
        // Extract author - look for text containing "Հեղինակ:"
        let author = 'Unknown Author';
        const allText = document.body.textContent;
        const authorMatch = allText.match(/Հեղինակ:\s*([^()\n]+?)(?:\s*\(|$)/);
        if (authorMatch) {
          author = authorMatch[1].trim();
        }
        
        // Extract description - look for paragraphs after the title
        let description = '';
        const paragraphs = document.querySelectorAll('p');
        for (const p of paragraphs) {
          const text = p.textContent.trim();
          if (text && text.length > 50 && !text.includes('Հեղինակ:') && !text.includes('Ընթերցող:') && !text.includes('Կատեգորիա:')) {
            description = text;
            break;
          }
        }
        
        // Extract duration - look for text containing "ժ" (hour)
        let duration = '';
        const durationMatch = allText.match(/(\d+ժ\s*\d+ր)/);
        if (durationMatch) {
          duration = durationMatch[1];
        }
        
        // Extract cover image
        const coverElement = document.querySelector('img[alt="Book Cover"]') ||
                            document.querySelector('img[alt*="Cover"]') ||
                            document.querySelector('.book-cover img') ||
                            document.querySelector('.cover img');
        const coverImageUrl = coverElement ? coverElement.src : '';
        
        // Extract audio URLs - focus on individual MP3 files, not download-all
        const audioUrls = [];
        
        // Look for audio elements
        const audioElements = document.querySelectorAll('audio source');
        audioElements.forEach(audio => {
          if (audio.src) {
            audioUrls.push(audio.src);
          }
        });
        
        // Look for individual MP3 download links (exclude download-all)
        const mp3Links = document.querySelectorAll('a[href*=".mp3"]');
        mp3Links.forEach(link => {
          const href = link.href;
          // Exclude download-all links and focus on individual MP3 files
          if (href && !href.includes('download-all') && !href.includes('.zip') && !audioUrls.includes(href)) {
            audioUrls.push(href);
          }
        });
        
        // Look for specific grqaser.org media URLs (individual MP3s)
        const mediaLinks = document.querySelectorAll('a[href*="media.grqaser.org"]');
        mediaLinks.forEach(link => {
          const href = link.href;
          if (href && href.includes('.mp3') && !href.includes('download-all') && !href.includes('.zip') && !audioUrls.includes(href)) {
            audioUrls.push(href);
          }
        });
        
        // Look for any links containing the specific pattern (individual MP3s)
        const allLinks = document.querySelectorAll('a[href]');
        allLinks.forEach(link => {
          const href = link.href;
          if (href && href.includes('media.grqaser.org') && href.includes('.mp3') && 
              !href.includes('download-all') && !href.includes('.zip') && !audioUrls.includes(href)) {
            audioUrls.push(href);
          }
        });
        
        // Also look in the page source for any individual MP3 URLs
        const pageSource = document.documentElement.outerHTML;
        const mp3UrlMatches = pageSource.match(/https:\/\/media\.grqaser\.org\/[^"'\s]+\.mp3/g);
        if (mp3UrlMatches) {
          mp3UrlMatches.forEach(url => {
            if (!url.includes('download-all') && !url.includes('.zip') && !audioUrls.includes(url)) {
              audioUrls.push(url);
            }
          });
        }
        
        // Look for chapter-specific links
        const chapterLinks = document.querySelectorAll('a[href*="chapter"], a[href*="chapters"]');
        chapterLinks.forEach(link => {
          const href = link.href;
          if (href && href.includes('.mp3') && !audioUrls.includes(href)) {
            audioUrls.push(href);
          }
        });
        
        // Extract chapter URLs
        const chapterUrls = [];
        const chapterElements = document.querySelectorAll('a[href*="chapter"], a[href*="chapters"]');
        chapterElements.forEach(chapter => {
          if (chapter.href && !chapterUrls.includes(chapter.href)) {
            chapterUrls.push(chapter.href);
          }
        });
        
        return {
          title,
          author,
          description,
          duration,
          coverImageUrl,
          audioUrls,
          chapterUrls
        };
      });
      
      // Update original book with extracted data
      const updatedBook = {
        ...originalBook,
        title: bookData.title || originalBook.title,
        author: bookData.author !== 'Unknown Author' ? bookData.author : originalBook.author,
        description: bookData.description || originalBook.description,
        duration: bookData.duration || originalBook.duration,
        cover_image_url: bookData.coverImageUrl || originalBook.cover_image_url,
        main_audio_url: bookData.audioUrls.length > 0 ? bookData.audioUrls[0] : originalBook.main_audio_url,
        chapter_urls: bookData.audioUrls.length > 0 ? JSON.stringify(bookData.audioUrls) : null,
        has_chapters: bookData.audioUrls.length > 1, // Multiple MP3s = has chapters
        chapter_count: bookData.audioUrls.length,
        crawl_status: 'completed',
        updated_at: new Date().toISOString()
      };
      
      console.log(`📊 Extracted data for ${updatedBook.title}:`);
      console.log(`   - Author: ${updatedBook.author}`);
      console.log(`   - Duration: ${updatedBook.duration}`);
      console.log(`   - Cover: ${updatedBook.cover_image_url ? 'Found' : 'Not found'}`);
      console.log(`   - Audio URLs: ${bookData.audioUrls.length}`);
      console.log(`   - Chapters: ${bookData.chapterUrls.length}`);
      
      return updatedBook;
      
    } catch (error) {
      console.error(`❌ Error extracting book details from ${url}:`, error.message);
      return null;
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
        console.log(`✅ Updated book ${book.id} in main database`);
        resolve();
      });
    });
  }

  async printStats() {
    const duration = Math.round((Date.now() - this.stats.startTime) / 1000);
    console.log('\n📊 Improved Crawler Statistics:');
    console.log(`   - Books processed: ${this.stats.booksProcessed}`);
    console.log(`   - Books updated: ${this.stats.booksUpdated}`);
    console.log(`   - Books with audio: ${this.stats.booksWithAudio}`);
    console.log(`   - Books with cover: ${this.stats.booksWithCover}`);
    console.log(`   - Errors: ${this.stats.errors}`);
    console.log(`   - Duration: ${duration}s`);
    console.log(`   - Database: ${this.dbPath}`);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    if (this.db) {
      this.db.close();
    }
    console.log('🧹 Improved crawler cleaned up');
  }
}

// Run the improved crawler
if (require.main === module) {
  const crawler = new ImprovedCrawler();
  crawler.run().catch(console.error);
}

module.exports = ImprovedCrawler;
