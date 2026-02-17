#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const readline = require('readline');

class UrlQueueManager {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/grqaser.db');
    this.db = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async initialize() {
    console.log('🔧 Initializing URL Queue Manager...');
    
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

  async showQueueStatus() {
    console.log('\n📋 === URL QUEUE STATUS ===');
    
    const sql = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(books_found) as total_books_found,
        SUM(books_saved) as total_books_saved
      FROM url_queue 
      GROUP BY status
      ORDER BY count DESC
    `;
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        let totalUrls = 0;
        let totalBooksFound = 0;
        let totalBooksSaved = 0;
        
        for (const row of rows) {
          console.log(`${row.status.toUpperCase()}: ${row.count} URLs`);
          if (row.total_books_found > 0) {
            console.log(`  📖 Books found: ${row.total_books_found}`);
          }
          if (row.total_books_saved > 0) {
            console.log(`  💾 Books saved: ${row.total_books_saved}`);
          }
          
          totalUrls += row.count;
          totalBooksFound += row.total_books_found || 0;
          totalBooksSaved += row.total_books_saved || 0;
        }
        
        console.log(`\n📊 TOTAL: ${totalUrls} URLs`);
        console.log(`📖 Total books found: ${totalBooksFound}`);
        console.log(`💾 Total books saved: ${totalBooksSaved}`);
        
        resolve();
      });
    });
  }

  async showPendingUrls(limit = 10) {
    console.log(`\n⏳ === PENDING URLS (showing first ${limit}) ===`);
    
    const sql = `
      SELECT id, url, url_type, priority, created_at, retry_count
      FROM url_queue 
      WHERE status IN ('pending', 'retry')
      ORDER BY priority DESC, created_at ASC
      LIMIT ?
    `;
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, [limit], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (rows.length === 0) {
          console.log('No pending URLs found.');
          resolve();
          return;
        }
        
        for (const row of rows) {
          console.log(`ID: ${row.id} | Priority: ${row.priority} | Type: ${row.url_type}`);
          console.log(`URL: ${row.url}`);
          console.log(`Created: ${row.created_at} | Retries: ${row.retry_count}`);
          console.log('-'.repeat(60));
        }
        
        resolve();
      });
    });
  }

  async showFailedUrls(limit = 10) {
    console.log(`\n❌ === FAILED URLS (showing first ${limit}) ===`);
    
    const sql = `
      SELECT id, url, url_type, error_message, retry_count, created_at
      FROM url_queue 
      WHERE status = 'failed'
      ORDER BY created_at DESC
      LIMIT ?
    `;
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, [limit], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (rows.length === 0) {
          console.log('No failed URLs found.');
          resolve();
          return;
        }
        
        for (const row of rows) {
          console.log(`ID: ${row.id} | Type: ${row.url_type} | Retries: ${row.retry_count}`);
          console.log(`URL: ${row.url}`);
          console.log(`Error: ${row.error_message || 'Unknown error'}`);
          console.log(`Created: ${row.created_at}`);
          console.log('-'.repeat(60));
        }
        
        resolve();
      });
    });
  }

  async showCompletedUrls(limit = 10) {
    console.log(`\n✅ === COMPLETED URLS (showing first ${limit}) ===`);
    
    const sql = `
      SELECT id, url, url_type, books_found, books_saved, completed_at
      FROM url_queue 
      WHERE status = 'completed'
      ORDER BY completed_at DESC
      LIMIT ?
    `;
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, [limit], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (rows.length === 0) {
          console.log('No completed URLs found.');
          resolve();
          return;
        }
        
        for (const row of rows) {
          console.log(`ID: ${row.id} | Type: ${row.url_type}`);
          console.log(`URL: ${row.url}`);
          console.log(`Books: Found ${row.books_found}, Saved ${row.books_saved}`);
          console.log(`Completed: ${row.completed_at}`);
          console.log('-'.repeat(60));
        }
        
        resolve();
      });
    });
  }

  async resetFailedUrls() {
    console.log('\n🔄 Resetting failed URLs to pending...');
    
    const sql = `
      UPDATE url_queue 
      SET status = 'pending', 
          error_message = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE status = 'failed'
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        console.log(`✅ Reset ${this.changes} failed URLs to pending`);
        resolve(this.changes);
      });
    });
  }

  async clearCompletedUrls() {
    console.log('\n🗑️ Clearing completed URLs...');
    
    const sql = 'DELETE FROM url_queue WHERE status = "completed"';
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        console.log(`✅ Cleared ${this.changes} completed URLs`);
        resolve(this.changes);
      });
    });
  }

  async addCustomUrl(url, urlType = 'page', priority = 1) {
    console.log(`\n➕ Adding custom URL: ${url}`);
    
    const sql = `
      INSERT OR IGNORE INTO url_queue (url, url_type, priority, status)
      VALUES (?, ?, ?, 'pending')
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [url, urlType, priority], function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        if (this.changes > 0) {
          console.log(`✅ Added URL to queue: ${url}`);
        } else {
          console.log(`⚠️ URL already exists in queue: ${url}`);
        }
        
        resolve(this.changes > 0);
      });
    });
  }

  async deleteUrl(urlId) {
    console.log(`\n🗑️ Deleting URL with ID: ${urlId}`);
    
    const sql = 'DELETE FROM url_queue WHERE id = ?';
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [urlId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        if (this.changes > 0) {
          console.log(`✅ Deleted URL with ID: ${urlId}`);
        } else {
          console.log(`⚠️ URL with ID ${urlId} not found`);
        }
        
        resolve(this.changes > 0);
      });
    });
  }

  async showMenu() {
    console.log('\n' + '='.repeat(60));
    console.log('🔗 URL QUEUE MANAGER');
    console.log('='.repeat(60));
    console.log('1. Show queue status');
    console.log('2. Show pending URLs');
    console.log('3. Show failed URLs');
    console.log('4. Show completed URLs');
    console.log('5. Reset failed URLs to pending');
    console.log('6. Clear completed URLs');
    console.log('7. Add custom URL');
    console.log('8. Delete URL by ID');
    console.log('0. Exit');
  }

  async getUserInput(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async run() {
    try {
      await this.initialize();
      
      while (true) {
        await this.showMenu();
        const choice = await this.getUserInput('\nEnter your choice (0-8): ');
        
        switch (choice) {
          case '0':
            console.log('👋 Goodbye!');
            this.rl.close();
            this.db.close();
            return;
            
          case '1':
            await this.showQueueStatus();
            break;
            
          case '2':
            const pendingLimit = await this.getUserInput('How many to show (default 10): ');
            await this.showPendingUrls(parseInt(pendingLimit) || 10);
            break;
            
          case '3':
            const failedLimit = await this.getUserInput('How many to show (default 10): ');
            await this.showFailedUrls(parseInt(failedLimit) || 10);
            break;
            
          case '4':
            const completedLimit = await this.getUserInput('How many to show (default 10): ');
            await this.showCompletedUrls(parseInt(completedLimit) || 10);
            break;
            
          case '5':
            const confirmReset = await this.getUserInput('Are you sure? (y/N): ');
            if (confirmReset.toLowerCase() === 'y') {
              await this.resetFailedUrls();
            } else {
              console.log('Operation cancelled.');
            }
            break;
            
          case '6':
            const confirmClear = await this.getUserInput('Are you sure? (y/N): ');
            if (confirmClear.toLowerCase() === 'y') {
              await this.clearCompletedUrls();
            } else {
              console.log('Operation cancelled.');
            }
            break;
            
          case '7':
            const url = await this.getUserInput('Enter URL: ');
            const urlType = await this.getUserInput('Enter URL type (page/book_detail/category/author, default: page): ');
            const priority = await this.getUserInput('Enter priority (1-10, default: 1): ');
            
            if (url) {
              await this.addCustomUrl(
                url, 
                urlType || 'page', 
                parseInt(priority) || 1
              );
            }
            break;
            
          case '8':
            const urlId = await this.getUserInput('Enter URL ID to delete: ');
            if (urlId) {
              await this.deleteUrl(parseInt(urlId));
            }
            break;
            
          default:
            console.log('❌ Invalid choice. Please try again.');
        }
        
        await this.getUserInput('\nPress Enter to continue...');
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      this.rl.close();
      if (this.db) {
        this.db.close();
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  const manager = new UrlQueueManager();
  manager.run();
}

module.exports = {
  UrlQueueManager
};

