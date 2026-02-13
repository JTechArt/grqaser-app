# Full Audiobooks Guide - Complete Implementation

## 🎯 Overview

This guide provides the complete steps to extract full audiobooks from grqaser.org with all chapters and MP3 links. The optimized crawler focuses on getting the complete audio content rather than just metadata.

## 📊 Data Structure

### Optimized Database Schema

#### Books Table (Focused on Audio Content)
```sql
CREATE TABLE books (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(200) NOT NULL,
  description TEXT,
  duration INTEGER,
  type VARCHAR(20) DEFAULT 'audiobook',
  language VARCHAR(10) DEFAULT 'hy',
  category VARCHAR(100),
  rating DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  cover_image_url VARCHAR(500),
  main_audio_url VARCHAR(500),      -- Main audio file URL
  download_url VARCHAR(500),        -- Direct download URL
  file_size BIGINT,
  published_at DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  crawl_status VARCHAR(20) DEFAULT 'pending',
  has_chapters BOOLEAN DEFAULT 0,   -- Whether book has separate chapters
  chapter_count INTEGER DEFAULT 0,  -- Number of chapters
  UNIQUE(title, author)
);
```

#### Chapters Table (Individual Chapter Audio Files)
```sql
CREATE TABLE chapters (
  id VARCHAR(50) PRIMARY KEY,
  book_id VARCHAR(50) REFERENCES books(id),
  title VARCHAR(500) NOT NULL,
  chapter_number INTEGER,
  duration INTEGER,
  audio_url VARCHAR(500),           -- Chapter audio file URL
  download_url VARCHAR(500),        -- Chapter download URL
  start_time INTEGER,               -- Start time in main audio (if applicable)
  end_time INTEGER,                 -- End time in main audio (if applicable)
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Implementation Steps

### Step 1: Install Dependencies
```bash
cd crawler
npm install
```

### Step 2: Run the Optimized Crawler
```bash
npm run optimized
```

### Step 3: Monitor Progress
The crawler will run in three phases:

#### Phase 1: Discovery (Find all audiobooks)
- Crawls multiple sources: `/books?types=audiobook`, `/books`, `/popular`, `/new`
- Extracts basic book information
- Saves to database with `crawl_status = 'discovered'`

#### Phase 2: Audio Details (Extract MP3 links)
- Visits each book's detail page
- Extracts main audio URL and download URL
- Identifies books with chapters
- Updates with `crawl_status = 'completed'`

#### Phase 3: Chapter Extraction (Get individual chapters)
- For books with chapters, extracts each chapter's audio file
- Saves chapter information to separate table
- Links chapters to main book

## 📋 What We Extract

### 1. Main Audio Files
- **Streaming URLs**: Direct playback links
- **Download URLs**: Direct download links
- **File sizes**: When available
- **Duration**: Total book length

### 2. Chapter Audio Files
- **Individual chapter URLs**: Each chapter as separate audio file
- **Chapter titles**: Descriptive chapter names
- **Chapter numbers**: Sequential ordering
- **Chapter durations**: Individual chapter lengths

### 3. Metadata
- **Book titles**: Clean, Armenian character preserved
- **Authors**: Full author names
- **Descriptions**: Book summaries
- **Categories**: Book classifications
- **Ratings**: User ratings when available
- **Cover images**: Book cover URLs

## 🔍 Audio Link Detection

### Main Audio Detection
```javascript
// Look for audio elements
const audioElement = document.querySelector('audio source, .audio-player source');
const downloadElement = document.querySelector('a[href*=".mp3"], a[href*="download"], .download-link');

return {
  mainAudioUrl: audioElement ? audioElement.src : null,
  downloadUrl: downloadElement ? downloadElement.href : null
};
```

### Chapter Audio Detection
```javascript
// Look for chapter elements
const chapterElements = document.querySelectorAll('.chapter, .chapter-item, [data-chapter], .chapter-link');

chapterElements.forEach((element, index) => {
  const audioElement = element.querySelector('audio source, .audio-link');
  const downloadElement = element.querySelector('a[href*=".mp3"], a[href*="download"]');
  
  return {
    title: titleElement.textContent.trim(),
    audioUrl: audioElement ? audioElement.src : null,
    downloadUrl: downloadElement ? downloadElement.href : null
  };
});
```

## 📊 Expected Results

### Quantitative Goals
- **500+ books** with complete audio links
- **1000+ chapters** with individual audio files
- **99%+** audio link extraction success rate
- **< 1%** broken link rate

### Data Quality
- **Complete audio coverage**: Every book has at least one audio link
- **Chapter granularity**: Individual chapter audio files when available
- **Multiple formats**: Both streaming and download URLs
- **Clean metadata**: Properly formatted titles and descriptions

## 🔧 Configuration

### Optimized Settings
```javascript
this.config = {
  maxPages: 200,              // Increased for more books
  timeout: 30000,             // 30 seconds per request
  retryAttempts: 3,           // Retry failed requests
  delayBetweenRequests: 1500, // 1.5 seconds between requests
  rateLimit: 40,              // 40 requests per minute
  userAgent: 'Mozilla/5.0 (compatible; GrqaserBot/3.0; +https://grqaser.org)'
};
```

### Performance Optimizations
- **Rate limiting**: 40 requests/minute (respectful crawling)
- **Parallel processing**: Efficient database operations
- **Error recovery**: Automatic retry with exponential backoff
- **Progress tracking**: Real-time statistics and reporting

## 📈 Monitoring Progress

### Real-time Statistics
```javascript
this.stats = {
  booksDiscovered: 0,      // Total books found
  booksProcessed: 0,       // Books with audio details
  booksFailed: 0,          // Failed extractions
  chaptersExtracted: 0,    // Total chapters found
  audioLinksFound: 0,      // Audio URLs extracted
  startTime: Date.now()
};
```

### Final Report
```json
{
  "timestamp": "2024-08-24T16:00:00Z",
  "duration": "3600 seconds",
  "statistics": {
    "booksDiscovered": 500,
    "booksProcessed": 485,
    "booksFailed": 15,
    "chaptersExtracted": 1200,
    "audioLinksFound": 485
  },
  "summary": {
    "totalBooks": 500,
    "processedBooks": 485,
    "failedBooks": 15,
    "chaptersExtracted": 1200,
    "audioLinksFound": 485,
    "successRate": "97%"
  }
}
```

## 🔗 React Native Integration

### Get Book with Audio
```javascript
// Get book with main audio URL
const book = await getBook(bookId);
const audioUrl = book.main_audio_url;

// Use with React Native Track Player
TrackPlayer.add({
  id: bookId,
  url: audioUrl,
  title: book.title,
  artist: book.author
});
```

### Get Book with Chapters
```javascript
// Get book with chapters
const book = await getBook(bookId);
const chapters = await getBookChapters(bookId);

// Play specific chapter
const chapter = chapters.find(c => c.chapter_number === 1);
TrackPlayer.add({
  id: `${bookId}_chapter_1`,
  url: chapter.audio_url,
  title: chapter.title,
  artist: book.author
});
```

## 🎯 Success Criteria

### Complete Audiobook Coverage
- ✅ **Every book** has at least one audio link
- ✅ **Chapter support** for books with multiple chapters
- ✅ **Multiple formats** (streaming + download)
- ✅ **Clean metadata** with proper formatting

### Performance Metrics
- ✅ **< 10 seconds** average processing time per book
- ✅ **99%+** audio link extraction success rate
- ✅ **< 1%** broken or invalid links
- ✅ **Complete chapter** extraction for multi-chapter books

### Data Quality
- ✅ **No duplicates** (title + author uniqueness)
- ✅ **Valid URLs** for all audio content
- ✅ **Proper encoding** of Armenian characters
- ✅ **Consistent formatting** across all data

## 🚀 Running the Complete Process

### 1. Start the Crawler
```bash
npm run optimized
```

### 2. Monitor Output
```
🚀 Initializing Optimized Grqaser Crawler...
✅ Crawler initialized successfully
🎯 Starting optimized crawling process...
🔍 Phase 1: Discovering audiobooks...
📚 Crawling source: /books?types=audiobook
📄 Crawling page 1: https://grqaser.org/books?types=audiobook
✅ Found 20 books on page 1
...
🔍 Phase 2: Extracting audio details...
📚 Processing 500 books for audio details
✅ Updated audio details for book: Book Title
...
🔍 Phase 3: Extracting chapters...
📚 Processing 150 books for chapters
✅ Extracted 5 chapters for book 1072
...
📊 Crawl Report:
{
  "totalBooks": 500,
  "processedBooks": 485,
  "chaptersExtracted": 1200,
  "audioLinksFound": 485,
  "successRate": "97%"
}
```

### 3. Verify Results
```bash
# Check database
sqlite3 data/grqaser.db "SELECT COUNT(*) as total_books FROM books;"
sqlite3 data/grqaser.db "SELECT COUNT(*) as total_chapters FROM chapters;"
sqlite3 data/grqaser.db "SELECT COUNT(*) as books_with_audio FROM books WHERE main_audio_url IS NOT NULL;"
```

## 🎉 Expected Outcome

After running the optimized crawler, you will have:

1. **500+ complete audiobooks** with full audio links
2. **1000+ individual chapters** with separate audio files
3. **Clean, structured data** ready for React Native app
4. **Multiple audio formats** (streaming + download)
5. **Complete metadata** for rich user experience

The crawler focuses specifically on extracting the audio content you need, eliminating unnecessary HTML data and focusing on the MP3 links and chapter structure that are essential for the audiobook application.
