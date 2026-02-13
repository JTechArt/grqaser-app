const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseMigrator {
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

  async migrateDatabase() {
    console.log('🔄 Starting database migration...');
    
    try {
      // Check current table structure
      await this.checkTableStructure();
      
      // Add missing columns
      await this.addMissingColumns();
      
      // Create book_queue table if it doesn't exist
      await this.createBookQueueTable();
      
      console.log('✅ Database migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async checkTableStructure() {
    console.log('🔍 Checking current table structure...');
    
    return new Promise((resolve, reject) => {
      this.db.all("PRAGMA table_info(books)", (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log('📋 Current books table columns:');
        rows.forEach(row => {
          console.log(`   ${row.name} (${row.type})`);
        });
        
        resolve(rows);
      });
    });
  }

  async addMissingColumns() {
    console.log('🔧 Adding missing columns...');
    
    const columnsToAdd = [
      { name: 'crawl_status', type: 'VARCHAR(20) DEFAULT "pending"' },
      { name: 'crawl_error', type: 'TEXT' },
      { name: 'crawl_attempts', type: 'INTEGER DEFAULT 0' },
      { name: 'last_crawl_attempt', type: 'TIMESTAMP' }
    ];
    
    for (const column of columnsToAdd) {
      try {
        await this.addColumnIfNotExists('books', column.name, column.type);
      } catch (error) {
        console.log(`   Column ${column.name} already exists or error: ${error.message}`);
      }
    }
  }

  async addColumnIfNotExists(tableName, columnName, columnDefinition) {
    return new Promise((resolve, reject) => {
      const sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`;
      
      this.db.run(sql, function(err) {
        if (err) {
          // Column might already exist
          resolve(false);
        } else {
          console.log(`   ✅ Added column: ${columnName}`);
          resolve(true);
        }
      });
    });
  }

  async createBookQueueTable() {
    console.log('🔧 Creating book_queue table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS book_queue (
        book_id INTEGER PRIMARY KEY,
        status VARCHAR(20) DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processing_started_at TIMESTAMP,
        completed_at TIMESTAMP
      )
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(createTableSQL, (err) => {
        if (err) {
          console.error('❌ Failed to create book_queue table:', err);
          reject(err);
        } else {
          console.log('✅ Book queue table created/verified');
          resolve();
        }
      });
    });
  }

  async updateExistingBooksStatus() {
    console.log('🔄 Updating existing books status...');
    
    return new Promise((resolve, reject) => {
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

  async showFinalStatus() {
    console.log('\n📊 === FINAL STATUS ===');
    
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
  const migrator = new DatabaseMigrator();
  
  try {
    await migrator.initialize();
    await migrator.migrateDatabase();
    await migrator.updateExistingBooksStatus();
    await migrator.showFinalStatus();
    
    console.log('\n🎉 Database migration and status update completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await migrator.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  DatabaseMigrator
};
