const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class BookStatusUpdater {
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

  async updateExistingBooksStatus() {
    console.log('🔄 Updating existing books status...');
    
    return new Promise((resolve, reject) => {
      // Update all books that have data but are marked as pending
      const sql = `
        UPDATE books 
        SET crawl_status = 'completed',
            crawl_attempts = 1,
            last_crawl_attempt = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE crawl_status = 'pending' 
        AND (title IS NOT NULL AND title != '')
      `;
      
      this.db.run(sql, function(err) {
        if (err) {
          console.error('❌ Error updating books status:', err);
          reject(err);
          return;
        }
        
        console.log(`✅ Updated ${this.changes} books from 'pending' to 'completed'`);
        resolve(this.changes);
      });
    });
  }

  async showUpdateSummary() {
    console.log('\n📊 === UPDATE SUMMARY ===');
    
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          crawl_status,
          COUNT(*) as count
        FROM books 
        GROUP BY crawl_status
        ORDER BY count DESC
      `, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        rows.forEach(row => {
          console.log(`   ${row.crawl_status}: ${row.count} books`);
        });
        
        resolve();
      });
    });
  }

  async cleanup() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Main execution
async function main() {
  const updater = new BookStatusUpdater();
  
  try {
    await updater.initialize();
    
    console.log('📋 Current status before update:');
    await updater.showUpdateSummary();
    
    console.log('\n🔄 Updating existing books...');
    const updatedCount = await updater.updateExistingBooksStatus();
    
    console.log('\n📋 Status after update:');
    await updater.showUpdateSummary();
    
    console.log(`\n✅ Successfully updated ${updatedCount} books!`);
    
  } catch (error) {
    console.error('❌ Error updating books status:', error);
  } finally {
    await updater.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  BookStatusUpdater
};
