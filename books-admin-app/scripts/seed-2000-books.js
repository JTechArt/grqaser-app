/**
 * Seed a SQLite database with 2000 books for performance testing (Story 10.5).
 * Output: books-admin-app/data/grqaser-2000.db
 *
 * Run: cd books-admin-app && node scripts/seed-2000-books.js
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const {
  CREATE_BOOKS_TABLE_SQL,
} = require('../src/crawler/schema/books-table.js');

const NUM_BOOKS = 2000;
const OUTPUT_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'grqaser-2000.db');

const AUTHORS = [
  'Author Alpha',
  'Author Beta',
  'Author Gamma',
  'Հովհաննես Թումանյան',
  'William Shakespeare',
  'Author Delta',
  'Author Epsilon',
  'Ավետիք Իսահակյան',
  'Leo Tolstoy',
  'Author Zeta',
];

const CATEGORIES = ['Fiction', 'Non-Fiction', 'History', 'Biography', 'Poetry', 'Drama', 'Children'];
const LANGUAGES = ['hy', 'en', 'ru'];

function generateBooks(count) {
  const books = [];
  const now = new Date().toISOString();

  for (let i = 1; i <= count; i++) {
    const author = AUTHORS[i % AUTHORS.length];
    const category = CATEGORIES[i % CATEGORIES.length];
    const lang = LANGUAGES[i % LANGUAGES.length];
    const duration = 600 + (i % 7200);
    const type = i % 10 === 0 ? 'ebook' : 'audiobook';

    books.push({
      id: i,
      title: `Book ${i}: The Story of ${author} Volume ${Math.floor(i / 100) + 1}`,
      author,
      description: `Description for book ${i}. A captivating ${category.toLowerCase()} work.`,
      duration,
      duration_formatted: `${Math.floor(duration / 60)}ր`,
      type,
      language: lang,
      category,
      rating: 3.5 + (i % 15) / 10,
      rating_count: 10 + (i % 100),
      cover_image_url: `https://example.com/covers/${i}.jpg`,
      main_audio_url: `https://example.com/audio/${i}.mp3`,
      download_url: `https://example.com/audio/${i}.mp3`,
      file_size: 1024000 + (i % 5000000),
      published_at: '2020-01-01',
      created_at: now,
      updated_at: now,
      is_active: 1,
      crawl_status: 'completed',
      has_chapters: i % 5 === 0 ? 1 : 0,
      chapter_count: i % 5 === 0 ? 5 : 0,
      chapter_urls: null,
      last_edited_at: null,
    });
  }

  return books;
}

function run() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (fs.existsSync(OUTPUT_PATH)) {
    fs.unlinkSync(OUTPUT_PATH);
  }

  const db = new Database(OUTPUT_PATH);

  db.exec(CREATE_BOOKS_TABLE_SQL);
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (version INTEGER);
    INSERT OR REPLACE INTO schema_version (version) VALUES (1);
  `);

  // Indexes for search performance (title, author LIKE queries)
  db.exec('CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)');

  const insert = db.prepare(`
    INSERT INTO books (
      id, title, author, description, duration, duration_formatted,
      type, language, category, rating, rating_count, cover_image_url,
      main_audio_url, download_url, file_size, published_at,
      created_at, updated_at, is_active, crawl_status,
      has_chapters, chapter_count, chapter_urls, last_edited_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const books = generateBooks(NUM_BOOKS);
  const insertMany = db.transaction(() => {
    for (const b of books) {
      insert.run(
        b.id, b.title, b.author, b.description, b.duration, b.duration_formatted,
        b.type, b.language, b.category, b.rating, b.rating_count, b.cover_image_url,
        b.main_audio_url, b.download_url, b.file_size, b.published_at,
        b.created_at, b.updated_at, b.is_active, b.crawl_status,
        b.has_chapters, b.chapter_count, b.chapter_urls, b.last_edited_at,
      );
    }
  });

  insertMany();

  const count = db.prepare('SELECT COUNT(*) as c FROM books').get();
  db.close();

  console.log(`Created ${OUTPUT_PATH} with ${count.c} books.`);
}

run();
