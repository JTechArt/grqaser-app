# Grqaser Crawler

A robust web crawler for extracting audiobook data from grqaser.org. This application is designed to efficiently crawl and store audiobook information in a SQLite database.

## 🚀 Features

- **Intelligent URL Queue Management**: Prioritized URL processing with retry logic
- **Concurrent Processing**: Configurable concurrent URL processing for optimal performance
- **Comprehensive Error Handling**: Robust error recovery and logging
- **Database Integration**: SQLite database with proper transaction management
- **Real-time Monitoring**: Live statistics and progress tracking
- **Configurable Settings**: Environment-specific configuration management

## 📁 Project Structure

```
crawler/
├── src/
│   ├── config/
│   │   └── crawler-config.js    # Configuration settings
│   ├── models/
│   │   └── database.js          # Database operations
│   ├── utils/
│   │   └── url-queue-manager.js # URL queue management
│   ├── tests/
│   │   └── crawler.test.js      # Test files
│   └── crawler.js               # Main crawler application
├── data/
│   └── grqaser.db              # SQLite database
├── logs/                       # Application logs
├── backup-old-files/           # Backup of old files
├── package.json
└── README.md
```

## 🛠️ Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create necessary directories**:
   ```bash
   mkdir -p data logs
   ```

## ⚙️ Configuration

The crawler uses a centralized configuration system. Edit `src/config/crawler-config.js` to customize:

- **Crawling settings**: Delays, timeouts, retry attempts
- **Browser settings**: Headless mode, browser arguments
- **Database settings**: Connection parameters
- **Logging settings**: Log levels, file rotation

### Environment Variables

Set `NODE_ENV` to switch between environments:
- `development`: Debug logging, slower crawling
- `production`: Info logging, optimized crawling

```bash
export NODE_ENV=production
```

## 🚀 Usage

### Basic Usage

```bash
# Start the crawler
node src/crawler.js

# Run with specific configuration
NODE_ENV=production node src/crawler.js
```

### Advanced Usage

```javascript
const Crawler = require('./src/crawler');

const crawler = new Crawler();

// Initialize and start crawling
async function startCrawling() {
  try {
    await crawler.initialize();
    await crawler.startCrawling();
  } catch (error) {
    console.error('Crawling failed:', error);
  } finally {
    await crawler.cleanup();
  }
}

startCrawling();
```

## 📊 Database Schema

### Books Table
```sql
CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(200) DEFAULT 'Unknown Author',
  description TEXT,
  duration INTEGER,
  type VARCHAR(50) DEFAULT 'audiobook',
  language VARCHAR(10) DEFAULT 'hy',
  category VARCHAR(100) DEFAULT 'Unknown',
  rating DECIMAL(3,2),
  rating_count INTEGER,
  cover_image_url TEXT,
  main_audio_url TEXT,
  download_url TEXT,
  file_size INTEGER,
  published_at DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  crawl_status VARCHAR(50) DEFAULT 'discovered',
  has_chapters BOOLEAN DEFAULT 0,
  chapter_count INTEGER DEFAULT 0
);
```

### URL Queue Table
```sql
CREATE TABLE url_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url VARCHAR(500) NOT NULL,
  url_type VARCHAR(50) NOT NULL,
  priority INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Crawl Logs Table
```sql
CREATE TABLE crawl_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  book_id INTEGER,
  url TEXT,
  error_details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 📈 Monitoring and Statistics

The crawler provides comprehensive statistics:

```javascript
// Get crawl statistics
const stats = await crawler.getStats();
console.log('Books found:', stats.booksFound);
console.log('Books saved:', stats.booksSaved);
console.log('Errors:', stats.errors);
console.log('Processing time:', stats.processingTime);
```

## 🔧 API Reference

### Crawler Class

#### Methods

- `initialize()`: Initialize the crawler (database, browser, URL queue)
- `startCrawling()`: Begin the crawling process
- `stopCrawling()`: Gracefully stop the crawler
- `getStats()`: Get current crawling statistics
- `cleanup()`: Clean up resources

#### Properties

- `stats`: Current crawling statistics
- `settings`: Current configuration settings
- `isRunning`: Whether the crawler is currently running

### Database Class

#### Methods

- `connect()`: Connect to the database
- `close()`: Close database connection
- `createTables()`: Create all necessary tables
- `saveBook(bookData)`: Save a book to the database
- `getBookById(id)`: Get a book by ID
- `getBooks(limit, offset)`: Get books with pagination
- `logCrawl(level, message, bookId, url, errorDetails)`: Log crawl activity

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run specific tests:

```bash
npm test -- --grep "crawler"
```

## 📝 Logging

Logs are written to `logs/crawler.log` with the following levels:
- `DEBUG`: Detailed debugging information
- `INFO`: General information about crawling progress
- `WARN`: Warning messages
- `ERROR`: Error messages with stack traces

## 🚨 Error Handling

The crawler implements comprehensive error handling:

- **Network Errors**: Automatic retry with exponential backoff
- **Database Errors**: Transaction rollback and recovery
- **Browser Errors**: Page reload and recovery
- **Rate Limiting**: Adaptive delays and backoff

## 🔒 Rate Limiting

The crawler respects rate limits by:
- Configurable delays between requests
- Adaptive delays based on server response
- Exponential backoff for failed requests
- Concurrent request limiting

## 📦 Dependencies

### Core Dependencies
- `puppeteer`: Browser automation
- `sqlite3`: Database operations
- `path`: File path utilities
- `fs`: File system operations

### Development Dependencies
- `jest`: Testing framework
- `nodemon`: Development server (optional)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **Database locked**: Ensure no other process is using the database
2. **Browser crashes**: Check system resources and browser arguments
3. **Network timeouts**: Adjust timeout settings in configuration
4. **Memory issues**: Reduce concurrent URL processing

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development node src/crawler.js
```

### Database Recovery

If the database becomes corrupted:

```bash
# Restore from backup
cp backups/grqaser_backup_YYYYMMDD_HHMMSS.db data/grqaser.db
```

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs in `logs/crawler.log`
3. Create an issue in the repository

## 🔗 Related Applications

- **Database Viewer**: [Grqaser Database Viewer](../database-viewer/) - Web-based data viewer
- **Mobile App**: [Grqaser Mobile App](../GrqaserApp/) - React Native mobile application
