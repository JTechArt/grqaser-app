/**
 * Add chapter_urls column to books table
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database-viewer/data/grqaser.db');

async function addChapterUrlsColumn() {
  console.log('🔧 Adding chapter_urls column to books table...');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Database connection error:', err);
        reject(err);
        return;
      }
      console.log('✅ Connected to database');
      
      // Check if column already exists
      db.get("PRAGMA table_info(books)", (err, rows) => {
        if (err) {
          console.error('❌ Error checking table schema:', err);
          reject(err);
          return;
        }
        
        // Add the chapter_urls column if it doesn't exist
        const addColumnSQL = `
          ALTER TABLE books 
          ADD COLUMN chapter_urls TEXT
        `;
        
        db.run(addColumnSQL, (err) => {
          if (err) {
            if (err.message.includes('duplicate column name')) {
              console.log('✅ chapter_urls column already exists');
            } else {
              console.error('❌ Error adding column:', err);
              reject(err);
              return;
            }
          } else {
            console.log('✅ Successfully added chapter_urls column');
          }
          
          db.close((err) => {
            if (err) {
              console.error('❌ Error closing database:', err);
            } else {
              console.log('✅ Database connection closed');
            }
            resolve();
          });
        });
      });
    });
  });
}

// Run the script
if (require.main === module) {
  addChapterUrlsColumn()
    .then(() => {
      console.log('🎉 Database schema updated successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to update database schema:', error);
      process.exit(1);
    });
}

module.exports = addChapterUrlsColumn;
