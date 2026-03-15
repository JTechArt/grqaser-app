# URL Queue System for Grqaser Crawler

## Overview

The URL Queue System is a robust solution for managing the crawling process efficiently. Instead of crawling URLs sequentially without tracking, this system maintains a database queue of URLs that need to be processed, tracks their status, and provides detailed monitoring and management capabilities.

## Key Benefits

1. **Efficient Processing**: URLs are processed in priority order, ensuring important pages are crawled first
2. **Error Tracking**: Failed URLs are tracked with error messages and retry counts
3. **Resume Capability**: Crawling can be stopped and resumed without losing progress
4. **Detailed Monitoring**: Real-time statistics and status tracking
5. **Flexible Management**: Add, remove, and modify URLs in the queue
6. **Performance Optimization**: Avoid duplicate processing and track success rates

## Database Schema

### URL Queue Table

```sql
CREATE TABLE url_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url VARCHAR(500) NOT NULL,
  url_type VARCHAR(50) NOT NULL, -- 'page', 'book_detail', 'category', 'author'
  priority INTEGER DEFAULT 1, -- Higher number = higher priority
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'retry'
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  books_found INTEGER DEFAULT 0,
  books_saved INTEGER DEFAULT 0,
  processing_started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(url)
);
```

## URL Types

- **page**: Listing pages (e.g., `/books?page=1`)
- **book_detail**: Individual book pages (e.g., `/book/123`)
- **category**: Category pages (e.g., `/category/fiction`)
- **author**: Author pages (e.g., `/author/john-doe`)

## Status Types

- **pending**: URL is waiting to be processed
- **processing**: URL is currently being crawled
- **completed**: URL was successfully processed
- **failed**: URL failed after maximum retries
- **retry**: URL failed but will be retried

## Usage

### 1. Running the Crawler

```bash
cd crawler
node src/grqaser-crawler.js
```

The crawler will:
- Create the URL queue table if it doesn't exist
- Initialize the queue with starting URLs
- Process URLs in priority order
- Track progress and errors
- Generate detailed reports

### 2. Monitoring the Queue

```bash
cd crawler
node src/url-queue-manager.js
```

The queue manager provides an interactive menu:
- Show queue status
- View pending, failed, and completed URLs
- Reset failed URLs to pending
- Clear completed URLs
- Add custom URLs
- Delete URLs by ID

### 3. Database Exploration

```bash
cd crawler/data
python explore_db.py
```

The database explorer now includes:
- URL queue statistics in the summary
- Option to view URL queue details
- Integration with existing book data

### 4. Testing the System

```bash
cd crawler
node test-url-queue.js
```

This test script verifies:
- URL queue table creation
- Queue manager functionality
- URL addition and status tracking

## Configuration

### Crawler Settings

```javascript
this.settings = {
  maxPages: 500,
  targetBooks: 500,
  delayBetweenPages: 1500,
  timeout: 30000,
  retryAttempts: 3,
  maxConcurrentUrls: 5 // Process multiple URLs concurrently
};
```

### Priority System

- **10**: High priority (main pages)
- **9-6**: Medium priority (pagination)
- **5-1**: Low priority (detail pages, categories)

## Workflow

1. **Initialization**: Crawler creates URL queue table and adds starting URLs
2. **Processing**: URLs are fetched from queue in priority order
3. **Crawling**: Each URL is processed based on its type
4. **Discovery**: New URLs found during crawling are added to queue
5. **Tracking**: Status, errors, and results are recorded
6. **Reporting**: Detailed statistics are generated

## Error Handling

- **Retry Logic**: Failed URLs are retried up to 3 times
- **Error Messages**: Detailed error information is stored
- **Graceful Degradation**: System continues with other URLs if one fails
- **Manual Recovery**: Failed URLs can be reset to pending status

## Performance Features

- **Duplicate Prevention**: URLs are unique in the queue
- **Priority Processing**: Important URLs are processed first
- **Batch Operations**: Multiple URLs can be processed efficiently
- **Memory Management**: URLs are processed one at a time to manage memory

## Monitoring and Analytics

### Queue Statistics
- Total URLs in queue
- URLs by status (pending, processing, completed, failed)
- Books found and saved per URL
- Success rates and error rates

### Performance Metrics
- Processing time per URL
- Books found per URL type
- Error patterns and common issues
- Queue throughput and efficiency

## Troubleshooting

### Common Issues

1. **URLs Stuck in Processing**
   - Check if crawler process is still running
   - Reset status to pending if needed

2. **High Failure Rate**
   - Review error messages in failed URLs
   - Check website availability and structure changes
   - Adjust timeout and retry settings

3. **Slow Processing**
   - Reduce delay between pages
   - Increase concurrent URL processing
   - Check network connectivity

### Maintenance

1. **Clear Completed URLs**: Remove old completed URLs to keep queue manageable
2. **Reset Failed URLs**: Retry failed URLs after fixing issues
3. **Add Custom URLs**: Manually add specific URLs for targeted crawling
4. **Monitor Queue Size**: Keep queue size reasonable for performance

## Integration with Existing System

The URL queue system integrates seamlessly with the existing crawler:

- **Backward Compatible**: Existing database structure is preserved
- **Enhanced Reporting**: More detailed statistics and progress tracking
- **Improved Reliability**: Better error handling and recovery
- **Flexible Management**: Easy monitoring and control of crawling process

## Future Enhancements

1. **Distributed Processing**: Multiple crawler instances sharing the same queue
2. **Advanced Scheduling**: Time-based URL processing
3. **Rate Limiting**: Configurable delays based on domain
4. **Content Validation**: Verify extracted data quality
5. **Export/Import**: Backup and restore queue state

## Conclusion

The URL Queue System significantly improves the crawling process by providing:

- **Reliability**: Robust error handling and recovery
- **Efficiency**: Priority-based processing and duplicate prevention
- **Visibility**: Detailed monitoring and reporting
- **Flexibility**: Easy management and customization
- **Scalability**: Foundation for future enhancements

This system addresses the original suggestion to create a separate table for URL management, providing a comprehensive solution that speeds up the crawling process and helps identify and resolve issues with incorrect URLs.

