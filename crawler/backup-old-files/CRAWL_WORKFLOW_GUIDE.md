# Crawl Workflow Guide

## Overview

This guide describes the new crawl workflow system that properly manages crawl status and prevents duplicate crawling. The system uses a `crawl_links` table to track the status of each book URL through the entire crawling process.

## Workflow Status Management

### Status Flow
```
NEW → IN_PROGRESS → SUCCESS/FAILED
```

1. **NEW**: Link generated, ready to be crawled
2. **IN_PROGRESS**: Currently being crawled
3. **SUCCESS**: Book successfully crawled and saved
4. **FAILED**: Crawling failed (with error details)
5. **RETRY**: Will be retried (for temporary failures)

## Current Status

### Books Database
- **Total Books**: 485 (all completed)
- **Success Rate**: 100%
- **Range**: IDs 1-99

### Crawl Links
- **NEW Links**: 1,010 (IDs 991-2000)
- **Ready for Processing**: Yes

## Step-by-Step Workflow

### Step 1: Generate Crawl Links
```bash
cd crawler
node generate-crawl-links.js
```

This script:
- Creates `crawl_links` table if it doesn't exist
- Checks current book range in database
- Generates links for remaining book IDs (991-2000)
- Sets all links to `NEW` status

**Output**: 1,010 new crawl links ready for processing

### Step 2: Check Status
```bash
node check-crawl-status.js
```

Shows comprehensive status:
- Books table status
- Crawl links status by state
- 404 analysis
- Summary statistics

**Additional options**:
```bash
# Show recent crawl links
node check-crawl-status.js --recent

# Show failed crawl links
node check-crawl-status.js --failed
```

### Step 3: Run Crawler
```bash
node src/sequential-crawler.js
```

The crawler will:
- Process only `NEW` links
- Update status to `IN_PROGRESS` when starting
- Update to `SUCCESS` when book is saved
- Update to `FAILED` with error details if crawling fails
- Skip already completed books automatically

### Step 4: Monitor Progress
During crawling, you'll see:
- Real-time progress updates
- Status changes for each link
- Error details for failed crawls
- Books found vs saved statistics

## Database Schema

### Crawl Links Table
```sql
CREATE TABLE crawl_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'NEW',
  priority INTEGER DEFAULT 1,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  books_found INTEGER DEFAULT 0,
  books_saved INTEGER DEFAULT 0,
  processing_started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(book_id)
)
```

### Books Table (Updated)
```sql
-- Added crawl status columns
crawl_status VARCHAR(20) DEFAULT 'pending'
crawl_error TEXT
crawl_attempts INTEGER DEFAULT 0
last_crawl_attempt TIMESTAMP
```

## Status Codes Explained

### Crawl Links Status
- **NEW**: Link generated, not yet processed
- **IN_PROGRESS**: Currently being crawled
- **SUCCESS**: Book successfully crawled and saved
- **FAILED**: Crawling failed (check error_message)
- **RETRY**: Will be retried on next run

### Books Status
- **pending**: Not yet crawled
- **completed**: Successfully crawled
- **failed**: Crawling failed (check crawl_error)

## Error Handling

### Retry Logic
- Failed links are retried up to 3 times by default
- Temporary errors (network, timeout) trigger retry
- Permanent errors (404, invalid page) are marked as FAILED

### Error Tracking
- Detailed error messages stored in `error_message` field
- Processing timestamps for debugging
- Retry count tracking

## Monitoring and Debugging

### Check Current Status
```bash
node check-crawl-status.js
```

### View Recent Activity
```bash
node check-crawl-status.js --recent
```

### Investigate Failures
```bash
node check-crawl-status.js --failed
```

### Database Queries
```sql
-- Check crawl links by status
SELECT status, COUNT(*) FROM crawl_links GROUP BY status;

-- Find failed links with errors
SELECT book_id, url, error_message FROM crawl_links WHERE status = 'FAILED';

-- Check processing times
SELECT book_id, processing_started_at, completed_at 
FROM crawl_links 
WHERE status IN ('SUCCESS', 'FAILED');
```

## Benefits of This System

### 1. No Duplicate Crawling
- Links are processed once and marked as SUCCESS/FAILED
- Already completed books are automatically skipped
- Prevents wasting resources on duplicate work

### 2. Comprehensive Error Tracking
- Detailed error messages for each failed crawl
- Retry mechanism for temporary failures
- Easy identification of problematic books

### 3. Progress Tracking
- Real-time status updates during crawling
- Clear visibility into what's been processed
- Ability to resume interrupted crawls

### 4. Scalability
- Works with any number of books
- Database-based tracking for persistence
- Can be easily extended for different crawling strategies

## Troubleshooting

### Common Issues

1. **No crawl links found**
   - Run `generate-crawl-links.js` first
   - Check if you're starting from the right position

2. **All links marked as FAILED**
   - Check error messages for patterns
   - Verify website structure hasn't changed
   - Check network connectivity

3. **Crawler not starting**
   - Ensure crawl_links table exists
   - Check for NEW status links
   - Verify database connection

### Performance Tips

1. **Batch Processing**: Process links in batches for better monitoring
2. **Error Investigation**: Check failed links regularly to identify patterns
3. **Resume Capability**: System can resume from where it left off
4. **Status Monitoring**: Use status checker to monitor progress

## Next Steps

1. **Start Crawling**: Run the sequential crawler to process the 1,010 NEW links
2. **Monitor Progress**: Use status checker to track progress
3. **Investigate Failures**: Check failed links for patterns
4. **Extend Range**: Generate more links if needed (beyond ID 2000)

The system is now ready to efficiently crawl the remaining books with proper status tracking and error handling!
