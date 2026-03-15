# Database Exploration Guide

This guide shows you how to explore the `grqaser.db` SQLite database containing crawled audiobook data from grqaser.org.

## 📊 Database Overview

The database contains the following tables:
- **books**: Main audiobook information (24 records)
- **chapters**: Individual chapter data (0 records - not yet populated)
- **authors**: Author information (0 records - not yet populated)
- **categories**: Category information (0 records - not yet populated)
- **book_authors**: Many-to-many relationship between books and authors (0 records)

## 🛠️ Quick Exploration Tools

### 1. Quick Overview
```bash
./quick_view.sh
```
Shows a summary of all data in the database.

### 2. Interactive Explorer
```bash
python3 explore_db.py
```
Provides an interactive menu to explore different aspects of the database.

## 🔍 Manual SQLite Commands

### Connect to Database
```bash
sqlite3 grqaser.db
```

### View All Tables
```sql
.tables
```

### View Table Schema
```sql
.schema books
.schema chapters
.schema authors
.schema categories
.schema book_authors
```

### Count Records
```sql
SELECT 'books' as table_name, COUNT(*) as count FROM books 
UNION ALL 
SELECT 'chapters', COUNT(*) FROM chapters 
UNION ALL 
SELECT 'authors', COUNT(*) FROM authors 
UNION ALL 
SELECT 'categories', COUNT(*) FROM categories;
```

### View Sample Books
```sql
SELECT id, title, author, duration, rating, category 
FROM books 
LIMIT 5;
```

### View Longest Books
```sql
SELECT title, author, 
       (duration / 3600) || 'h ' || ((duration % 3600) / 60) || 'm' as duration
FROM books 
WHERE duration IS NOT NULL 
ORDER BY duration DESC 
LIMIT 5;
```

### Search Books
```sql
SELECT title, author, duration, rating 
FROM books 
WHERE title LIKE '%search_term%' OR author LIKE '%search_term%';
```

### Check Crawl Status
```sql
SELECT crawl_status, COUNT(*) as count 
FROM books 
GROUP BY crawl_status;
```

## 📈 Current Data Status

### Books Table (24 records)
- **Status**: All books are in "discovered" status
- **Audio URLs**: None have audio URLs yet (need further crawling)
- **Ratings**: None have ratings yet
- **Categories**: All marked as "Unknown"
- **Language**: All are Armenian (hy)
- **Duration**: Available for all books (ranging from 12 minutes to 24+ hours)

### Sample Book Data
```
ID: 1079
Title: Թալինթ Պֆեսթ
Author: Գևորգ Տեր-Գաբրիելյան
Duration: 10h 7m
Rating: N/A
Category: Unknown
Language: hy
Has Audio: No
Created: 2025-08-30 16:32:20
```

## 🚀 Next Steps for Data Completion

1. **Audio URL Crawling**: Need to crawl individual book pages to get audio URLs
2. **Rating Extraction**: Extract ratings from book detail pages
3. **Category Classification**: Properly categorize books
4. **Author Information**: Populate authors table and create relationships
5. **Chapter Data**: Extract chapter information for books with chapters

## 📝 Useful Queries for Development

### Get Books Ready for Audio Crawling
```sql
SELECT id, title, author 
FROM books 
WHERE main_audio_url IS NULL OR main_audio_url = '';
```

### Get Books by Duration Range
```sql
SELECT title, author, duration 
FROM books 
WHERE duration BETWEEN 3600 AND 7200  -- 1-2 hours
ORDER BY duration;
```

### Get Recent Additions
```sql
SELECT title, author, created_at 
FROM books 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔧 Database Schema Details

### Books Table
- `id`: Unique book identifier
- `title`: Book title (Armenian)
- `author`: Author name (Armenian)
- `description`: Book description (TEXT)
- `duration`: Duration in seconds (INTEGER)
- `type`: Book type (default: 'audiobook')
- `language`: Language code (default: 'hy')
- `category`: Book category
- `rating`: Rating (DECIMAL 3,2)
- `rating_count`: Number of ratings
- `cover_image_url`: Cover image URL
- `main_audio_url`: Main audio file URL
- `download_url`: Direct download URL
- `file_size`: File size in bytes
- `published_at`: Publication date
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp
- `is_active`: Active status (BOOLEAN)
- `crawl_status`: Crawling status
- `has_chapters`: Whether book has chapters
- `chapter_count`: Number of chapters

## 🐛 Troubleshooting

### Database Locked
If you get a "database is locked" error:
```bash
# Check if any process is using the database
lsof grqaser.db
```

### Permission Issues
```bash
# Make sure you have read permissions
ls -la grqaser.db
```

### SQLite Not Installed
On macOS:
```bash
brew install sqlite3
```

On Ubuntu/Debian:
```bash
sudo apt-get install sqlite3
```

## 📚 Additional Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [SQLite Command Line Tool](https://www.sqlite.org/cli.html)
- [Python sqlite3 Module](https://docs.python.org/3/library/sqlite3.html)
