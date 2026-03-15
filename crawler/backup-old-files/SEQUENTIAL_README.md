# Sequential Crawler for Grqaser

A new, more efficient approach to crawling the Grqaser audiobook platform by directly iterating through book IDs.

## 🚀 Quick Start

### Prerequisites
```bash
npm install
```

### Test the Crawler (Small Range)
```bash
npm run test-sequential
```

### Run Full Crawl (1-2000)
```bash
npm run sequential
```

## 📊 How It Works

Instead of crawling listing pages and extracting links, this crawler:

1. **Directly visits book pages** using the pattern `/hy/books/{bookID}`
2. **Loops through IDs 1-2000** systematically
3. **Handles 404s gracefully** - many IDs won't exist
4. **Extracts detailed book data** from each valid page
5. **Saves to SQLite database** with comprehensive analysis

## 🎯 Key Advantages

### ✅ **Completeness**
- Guarantees to check every possible book ID
- No risk of missing books due to pagination issues
- No dependency on listing page structure

### ⚡ **Efficiency**
- Direct access to book detail pages
- No need to parse listing pages
- Consistent processing speed

### 📈 **Analysis**
- Clear understanding of book ID ranges
- 404 analysis for website insights
- Accurate coverage reporting

## 📋 Expected Results

| Metric | Expected Value |
|--------|----------------|
| **Total Range** | 1-2000 (2000 possible books) |
| **Expected 404s** | ~1000-1500 (50-75% 404 rate) |
| **Expected Books** | ~500-1000 actual books |
| **Coverage** | ~25-50% of range contains books |
| **Processing Time** | ~33 minutes for 2000 books |

## 🔧 Configuration

Edit `run-sequential-crawler.js` to customize:

```javascript
const config = {
  startId: 1,                    // Starting book ID
  endId: 2000,                   // Ending book ID
  delayBetweenRequests: 1000,    // Delay between requests (ms)
  timeout: 15000,                // Page load timeout (ms)
  save404s: true                 // Save 404 responses for analysis
};
```

## 📊 Database Schema

### Books Table
```sql
CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(200) DEFAULT 'Unknown Author',
  description TEXT,
  duration VARCHAR(100),
  cover_image_url TEXT,
  main_audio_url TEXT,
  rating DECIMAL(3,2),
  type VARCHAR(50) DEFAULT 'audiobook',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id)
);
```

### Not Found Books Table (404 Analysis)
```sql
CREATE TABLE not_found_books (
  id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  status_code INTEGER DEFAULT 404,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(book_id)
);
```

## 📈 Progress Monitoring

The crawler provides real-time updates:

```
📊 Progress: 25.0% (500/2000)
📖 Books found: 125
💾 Books saved: 125
✅ Success rate: 25.0%
❌ Failed requests: 375
```

## 🔍 Data Extraction

The crawler extracts comprehensive book data using multiple CSS selectors:

- **Title**: `h1`, `.book-title`, `.title`, etc.
- **Author**: `.author`, `.book-author`, `.writer`, etc.
- **Description**: `.description`, `.book-description`, `.summary`, etc.
- **Duration**: `.duration`, `.book-duration`, `.time`, etc.
- **Rating**: `.rating`, `.book-rating`, `.stars`, etc.
- **Cover Image**: `.book-cover img`, `.cover img`, etc.
- **Audio URL**: `audio source`, `.audio-player source`, etc.

## 🛠️ Usage Examples

### Basic Usage
```bash
# Run with default settings (1-2000)
npm run sequential
```

### Test Mode
```bash
# Test with small range (1-10)
npm run test-sequential
```

### Custom Range
```javascript
// Edit run-sequential-crawler.js
const config = {
  startId: 100,
  endId: 500,
  delayBetweenRequests: 2000
};
```

### Programmatic Usage
```javascript
const { SequentialCrawler } = require('./src/sequential-crawler');

const crawler = new SequentialCrawler();
crawler.settings.startId = 1;
crawler.settings.endId = 1000;

await crawler.initialize();
await crawler.crawl();
```

## 📊 Analysis Tools

### View Results
```bash
# Quick database view
sqlite3 data/grqaser.db "SELECT COUNT(*) as total_books FROM books;"
sqlite3 data/grqaser.db "SELECT COUNT(*) as total_404s FROM not_found_books;"
```

### Coverage Analysis
```sql
-- Book coverage percentage
SELECT 
  (COUNT(*) * 100.0 / 2000) as coverage_percentage,
  COUNT(*) as books_found,
  (2000 - COUNT(*)) as books_not_found
FROM books;
```

## 🚨 Error Handling

### 404 Responses
- Automatically detected and logged
- No retry attempts (expected behavior)
- Stored for analysis

### Network Errors
- Timeout handling (15s default)
- Connection error handling
- Automatic retry for network issues

### Data Extraction Errors
- Graceful handling of missing elements
- Fallback selectors for different layouts
- Detailed error logging

## 🔄 Comparison with Original Crawler

| Feature | Original Crawler | Sequential Crawler |
|---------|------------------|-------------------|
| **Approach** | Crawl listings → Extract links → Follow links | Direct ID iteration |
| **Completeness** | Depends on listing structure | Guaranteed coverage |
| **Speed** | Faster for small datasets | Consistent speed |
| **Reliability** | High dependency on structure | Low dependency on structure |
| **Analysis** | Limited insights | Detailed coverage analysis |
| **Memory** | Higher (stores URLs) | Lower (sequential) |
| **Network Load** | Variable | Consistent and respectful |

## 🎯 Best Practices

### 1. **Respectful Crawling**
- Use appropriate delays (1-2 seconds)
- Don't overwhelm the server
- Monitor for rate limiting

### 2. **Testing**
- Start with small ranges for testing
- Verify data extraction works
- Check database connectivity

### 3. **Monitoring**
- Watch progress updates
- Monitor success rates
- Check for errors

### 4. **Analysis**
- Review 404 patterns
- Analyze book ID distribution
- Use coverage data for insights

## 🚀 Future Enhancements

### Planned Features
- **Parallel Processing**: Multiple ID ranges simultaneously
- **Smart Ranges**: Skip known empty ranges
- **Incremental Updates**: Resume from last position
- **Advanced Analysis**: Statistical insights on book ranges

### Optimization Ideas
- **Caching**: Cache successful page structures
- **Rate Limiting**: Adaptive delays based on server response
- **Retry Logic**: Smart retry for temporary failures
- **Data Validation**: Enhanced data quality checks

## 📝 Troubleshooting

### Common Issues

1. **High 404 Rate**
   - Normal for sequential crawling
   - Expected 50-75% 404 rate
   - Review 404 patterns for insights

2. **Slow Processing**
   - Increase delays between requests
   - Check network connectivity
   - Monitor server response times

3. **Database Errors**
   - Check disk space
   - Verify database permissions
   - Review SQLite configuration

4. **Memory Issues**
   - Sequential crawler uses minimal memory
   - Check for browser memory leaks
   - Restart if needed

## 📚 Documentation

- [Sequential Crawler Guide](./docs/SEQUENTIAL_CRAWLER_GUIDE.md) - Detailed technical guide
- [Database Schema](./docs/SEQUENTIAL_CRAWLER_GUIDE.md#database-schema) - Complete schema documentation
- [Configuration Options](./docs/SEQUENTIAL_CRAWLER_GUIDE.md#configuration) - All available settings

## 🤝 Contributing

1. Test with small ranges first
2. Monitor for errors and edge cases
3. Suggest improvements for data extraction
4. Report any issues with specific book IDs

## 📄 License

MIT License - see main project license for details.
