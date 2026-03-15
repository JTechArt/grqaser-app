# Sequential Crawler Guide

## Overview

The Sequential Crawler is a new approach for crawling the Grqaser website that directly targets individual book pages using known URL patterns. Instead of crawling listing pages and extracting links, this crawler systematically visits book detail pages by iterating through book IDs.

## URL Pattern

The crawler uses the known URL pattern: `/hy/books/{bookID}` where `bookID` is a sequential number.

## Key Features

### 1. **Sequential ID Crawling**
- Loops through book IDs from 1 to 2000 (configurable)
- Directly visits each book detail page
- Handles 404 responses gracefully

### 2. **Efficient Processing**
- No need to scroll through listing pages
- No need to extract and follow links
- Processes one book at a time sequentially
- Respectful delays between requests

### 3. **Comprehensive Data Extraction**
- Extracts all book details from individual pages
- Uses multiple CSS selectors for robust extraction
- Handles various page layouts and structures

### 4. **404 Analysis**
- Logs all 404 responses for analysis
- Provides coverage statistics
- Helps understand the actual book range

## Usage

### Basic Usage

```bash
cd crawler
node run-sequential-crawler.js
```

### Configuration

Edit `run-sequential-crawler.js` to modify settings:

```javascript
const config = {
  startId: 1,           // Starting book ID
  endId: 2000,          // Ending book ID
  delayBetweenRequests: 1000,  // Delay between requests (ms)
  timeout: 15000,       // Page load timeout (ms)
  save404s: true        // Save 404 responses for analysis
};
```

### Programmatic Usage

```javascript
const { SequentialCrawler } = require('./src/sequential-crawler');

const crawler = new SequentialCrawler();
crawler.settings.startId = 1;
crawler.settings.endId = 1000;
crawler.settings.delayBetweenRequests = 2000;

await crawler.initialize();
await crawler.crawl();
```

## Database Schema

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

### Not Found Books Table
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

## Advantages Over Traditional Crawling

### 1. **Completeness**
- Guarantees to check every possible book ID
- No risk of missing books due to pagination issues
- No dependency on listing page structure

### 2. **Efficiency**
- Direct access to book detail pages
- No need to parse listing pages
- Faster processing for large datasets

### 3. **Reliability**
- Less dependent on website structure changes
- Handles 404s gracefully
- Provides clear coverage statistics

### 4. **Analysis**
- Clear understanding of book ID ranges
- 404 analysis for website structure insights
- Accurate coverage reporting

## Expected Results

### Coverage Analysis
- **Total Range**: 1-2000 (2000 possible books)
- **Expected 404s**: ~1000-1500 (50-75% 404 rate)
- **Expected Books**: ~500-1000 actual books
- **Coverage**: ~25-50% of the range contains actual books

### Performance
- **Processing Speed**: ~1 book per second (with 1s delay)
- **Total Time**: ~33 minutes for 2000 books
- **Memory Usage**: Low (sequential processing)
- **Network Load**: Respectful (1s delays)

## Monitoring and Progress

The crawler provides real-time progress updates:

```
📊 Progress: 25.0% (500/2000)
📖 Books found: 125
💾 Books saved: 125
✅ Success rate: 25.0%
❌ Failed requests: 375
```

## Error Handling

### 1. **404 Responses**
- Automatically detected and logged
- No retry attempts for 404s
- Stored in `not_found_books` table

### 2. **Network Errors**
- Timeout handling (15s default)
- Connection error handling
- Automatic retry for network issues

### 3. **Data Extraction Errors**
- Graceful handling of missing elements
- Fallback selectors for different page layouts
- Detailed error logging

## Comparison with Original Crawler

| Feature | Original Crawler | Sequential Crawler |
|---------|------------------|-------------------|
| **Approach** | Crawl listing pages → Extract links → Follow links | Direct ID iteration |
| **Completeness** | Depends on listing page structure | Guaranteed coverage |
| **Speed** | Faster for small datasets | Consistent speed |
| **Reliability** | High dependency on listing structure | Low dependency on structure |
| **Analysis** | Limited coverage insights | Detailed coverage analysis |
| **Memory Usage** | Higher (stores URLs) | Lower (sequential) |
| **Network Load** | Variable | Consistent and respectful |

## Best Practices

### 1. **Respectful Crawling**
- Use appropriate delays (1-2 seconds)
- Don't overwhelm the server
- Monitor for rate limiting

### 2. **Configuration**
- Start with a small range for testing
- Adjust delays based on server response
- Monitor success rates

### 3. **Analysis**
- Review 404 patterns for insights
- Analyze book ID distribution
- Use coverage data for optimization

### 4. **Maintenance**
- Regular database backups
- Monitor disk space usage
- Clean up old 404 logs periodically

## Troubleshooting

### Common Issues

1. **High 404 Rate**
   - Normal for sequential crawling
   - Expected 50-75% 404 rate
   - Review 404 patterns for insights

2. **Slow Processing**
   - Increase delays between requests
   - Check network connectivity
   - Monitor server response times

3. **Memory Issues**
   - Sequential crawler uses minimal memory
   - Check for memory leaks in browser
   - Restart if needed

4. **Database Errors**
   - Check disk space
   - Verify database permissions
   - Review SQLite configuration

## Future Enhancements

### 1. **Parallel Processing**
- Process multiple ID ranges simultaneously
- Use worker threads for better performance
- Maintain respectful rate limiting

### 2. **Smart ID Ranges**
- Analyze 404 patterns to optimize ranges
- Skip known empty ranges
- Focus on high-density ID ranges

### 3. **Incremental Updates**
- Track last processed ID
- Resume from last position
- Update existing books only

### 4. **Advanced Analysis**
- Book ID distribution analysis
- Gap analysis for missing books
- Statistical insights on book ranges
