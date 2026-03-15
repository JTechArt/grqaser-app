/**
 * Fix Download-All Crawler
 * 
 * This crawler specifically targets books that have "download-all" URLs
 * and extracts individual MP3 files instead.
 */

const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database-viewer/data/grqaser.db');

class FixDownloadAllCrawler {
  constructor() {
    this.browser = null;
    this.page = null;
    this.db = null;
    this.maxBooks = 20; // Process fewer books for testing
    this.batchSize = 5;
  }

  async init() {
    console.log('🚀 Initializing Fix Download-All Crawler...');
    
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

    this.page = await this.browser.newPage();
    
    // Set user agent
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set viewport
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    console.log('✅ Fix Download-All Crawler initialized');
  }

  async getBooksWithDownloadAll() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, title, main_audio_url, chapter_urls 
        FROM books 
        WHERE main_audio_url LIKE '%download-all%' 
        OR (main_audio_url IS NOT NULL AND main_audio_url != '' AND chapter_urls IS NULL)
        ORDER BY id 
        LIMIT ?
      `;
      
      this.db.all(sql, [this.maxBooks], (err, rows) => {
        if (err) {
          console.error('❌ Error getting books with download-all:', err);
          reject(err);
          return;
        }
        console.log(`📚 Found ${rows.length} books with download-all URLs`);
        resolve(rows);
      });
    });
  }

  async extractBookDetails(url, originalBook) {
    try {
      console.log(`📍 URL: ${url}`);
      
      await this.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for content to load
      await this.page.waitForTimeout(2000);

      const bookData = await this.page.evaluate(() => {
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

        // Extract individual MP3 URLs - more aggressive approach
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

        // Method 4: Look for any links that contain media.grqaser.org and .mp3
        document.querySelectorAll('a[href]').forEach(link => {
          const href = link.href;
          if (href && href.includes('media.grqaser.org') && href.includes('.mp3') && !href.includes('download-all') && !href.includes('.zip') && !audioUrls.includes(href)) {
            audioUrls.push(href);
          }
        });

        // Method 5: Parse page source for MP3 URLs
        const pageSource = document.documentElement.outerHTML;
        const mp3UrlMatches = pageSource.match(/https:\/\/media\.grqaser\.org\/[^"'\s]+\.mp3/g);
        if (mp3UrlMatches) {
          mp3UrlMatches.forEach(url => {
            if (!url.includes('download-all') && !url.includes('.zip') && !audioUrls.includes(url)) {
              audioUrls.push(url);
            }
          });
        }

        // Method 6: Look for chapter links
        document.querySelectorAll('a[href*="chapter"], a[href*="chapters"]').forEach(link => {
          const href = link.href;
          if (href && href.includes('.mp3') && !audioUrls.includes(href)) {
            audioUrls.push(href);
          }
        });

        // Method 7: Look for numbered MP3 files (001_, 002_, etc.)
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

      console.log(`📊 Extracted data for ${bookData.title}:`);
      console.log(`   - Author: ${bookData.author}`);
      console.log(`   - Duration: ${bookData.duration}`);
      console.log(`   - Cover: ${bookData.coverImageUrl ? 'Found' : 'Not found'}`);
      console.log(`   - Audio URLs: ${bookData.audioUrls.length}`);
      console.log(`   - Chapters: ${bookData.audioUrls.length > 1 ? bookData.audioUrls.length : 0}`);

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

      if (bookData.coverImageUrl) {
        console.log(`✅ Cover image found: ${bookData.coverImageUrl}`);
      }

      if (bookData.audioUrls.length > 0) {
        console.log(`✅ Audio URL found: ${bookData.audioUrls[0]}`);
        if (bookData.audioUrls.length > 1) {
          console.log(`✅ Found ${bookData.audioUrls.length} individual MP3 files`);
        }
      }

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
        console.log(`✅ Updated book ${book.id} in main database`);
        resolve();
      });
    });
  }

  async processBooks() {
    try {
      const books = await this.getBooksWithDownloadAll();
      
      if (books.length === 0) {
        console.log('🎉 No books with download-all URLs found!');
        return;
      }

      const batches = Math.ceil(books.length / this.batchSize);
      
      for (let i = 0; i < batches; i++) {
        const start = i * this.batchSize;
        const end = Math.min(start + this.batchSize, books.length);
        const batch = books.slice(start, end);
        
        console.log(`\n🔄 Processing batch ${i + 1}/${batches}`);
        
        for (const book of batch) {
          console.log(`\n🔍 Processing book ID: ${book.id} - ${book.title}`);
          
          const url = `https://grqaser.org/books/${book.id}`;
          const updatedBook = await this.extractBookDetails(url, book);
          await this.updateBook(updatedBook);
          
          // Small delay between requests
          await this.page.waitForTimeout(1000);
        }
      }

    } catch (error) {
      console.error('❌ Error processing books:', error);
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    if (this.db) {
      this.db.close();
    }
    console.log('🧹 Fix Download-All crawler cleaned up');
  }
}

// Run the crawler
async function main() {
  const crawler = new FixDownloadAllCrawler();
  
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

module.exports = FixDownloadAllCrawler;
