# Grqaser Database Viewer

A web-based application for viewing and managing audiobook data from the Grqaser crawler. This application provides a comprehensive interface to explore crawled data, monitor crawler status, and analyze statistics.

## 🚀 Features

- **📊 Real-time Statistics**: View comprehensive statistics about crawled data
- **📖 Book Management**: Browse, search, and filter audiobooks
- **🔍 Advanced Filtering**: Filter by author, category, status, and duration
- **📈 Crawler Monitoring**: Monitor crawler status and URL queue
- **📝 Log Analysis**: View detailed crawl logs and error tracking
- **🎨 Modern UI**: Clean, responsive web interface
- **⚡ Fast API**: RESTful API with pagination and caching

## 📁 Project Structure

```
database-viewer/
├── src/
│   ├── config/
│   │   └── config.js           # Application configuration
│   ├── models/
│   │   └── database.js         # Database operations
│   ├── routes/
│   │   ├── books.js           # Books API routes
│   │   ├── stats.js           # Statistics API routes
│   │   └── crawler.js         # Crawler monitoring routes
│   └── server.js              # Main Express server
├── public/
│   └── index.html             # Web UI
├── logs/                      # Application logs
├── package.json
└── README.md
```

## 🛠️ Installation

1. **Navigate to the database viewer directory**:
   ```bash
   cd database-viewer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create necessary directories**:
   ```bash
   mkdir -p logs data
   ```

4. **Copy the database file** (if not already present):
   ```bash
   cp ../crawler/data/grqaser.db data/
   ```

## ⚙️ Configuration

The application uses a centralized configuration system. Edit `src/config/config.js` to customize:

- **Server settings**: Port, host, environment
- **Database settings**: Path, timeout, verbose mode
- **API settings**: Rate limiting, pagination
- **Security settings**: CORS, helmet configuration

### Environment Variables

Set environment variables to override defaults:

```bash
export PORT=3001
export NODE_ENV=production
export DB_PATH=/path/to/grqaser.db
export CORS_ORIGIN=http://localhost:3000
```

## 🚀 Usage

### Development Mode

```bash
# Start in development mode
npm run dev

# Or manually
NODE_ENV=development node src/server.js
```

### Production Mode

```bash
# Start in production mode
npm start

# Or manually
NODE_ENV=production node src/server.js
```

### Access the Application

- **Web UI**: http://localhost:3001
- **API Base**: http://localhost:3001/api/v1
- **Health Check**: http://localhost:3001/api/v1/health

## 📊 API Endpoints

### Books Endpoints

#### Get All Books
```bash
GET /api/v1/books?page=1&limit=20&author=Author&category=Category&crawl_status=discovered
```

#### Get Book by ID
```bash
GET /api/v1/books/1234
```

#### Search Books
```bash
GET /api/v1/books/search?q=search_term&page=1&limit=20
```

### Statistics Endpoints

#### Get Overview Statistics
```bash
GET /api/v1/stats/overview
```

#### Get Authors Statistics
```bash
GET /api/v1/stats/authors
```

#### Get Categories Statistics
```bash
GET /api/v1/stats/categories
```

### Crawler Monitoring Endpoints

#### Get Crawler Status
```bash
GET /api/v1/crawler/status
```

#### Get URL Queue
```bash
GET /api/v1/crawler/urls?status=pending
```

#### Get Crawl Logs
```bash
GET /api/v1/crawler/logs?page=1&limit=20&level=error
```

### Health Check
```bash
GET /api/v1/health
```

## 🎨 Web Interface

The web interface provides:

### Dashboard
- **Statistics Cards**: Total books, discovered, processed, failed
- **Real-time Updates**: Live statistics from the database
- **Quick Overview**: Key metrics at a glance

### Books Management
- **Advanced Filtering**: Filter by author, category, status, duration
- **Search Functionality**: Full-text search across titles and authors
- **Sorting Options**: Sort by date, title, author, duration
- **Pagination**: Navigate through large datasets
- **Book Details**: View comprehensive book information

### Crawler Monitoring
- **Status Overview**: Current crawler status and progress
- **URL Queue**: Monitor pending and processing URLs
- **Error Tracking**: View and analyze crawl errors
- **Performance Metrics**: Track crawling performance

## 🔧 API Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "books": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "BOOK_NOT_FOUND",
    "message": "Book with ID 1234 not found",
    "details": {
      "book_id": 1234
    }
  }
}
```

## 📈 Database Schema

The application works with the following database tables:

### Books Table
- `id`: Unique book identifier
- `title`: Book title
- `author`: Author name
- `description`: Book description
- `duration`: Duration in seconds
- `category`: Book category
- `crawl_status`: Current crawling status
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### URL Queue Table
- `id`: Queue entry ID
- `url`: URL to process
- `url_type`: Type of URL
- `priority`: Processing priority
- `status`: Current status
- `retry_count`: Number of retry attempts

### Crawl Logs Table
- `id`: Log entry ID
- `level`: Log level (INFO, WARN, ERROR)
- `message`: Log message
- `book_id`: Associated book ID
- `url`: Associated URL
- `created_at`: Timestamp

## 🚨 Error Handling

The application implements comprehensive error handling:

- **Database Errors**: Connection issues and query failures
- **API Errors**: Invalid requests and validation errors
- **Network Errors**: Timeout and connection issues
- **Rate Limiting**: Request throttling and limits

## 🔒 Security Features

- **Helmet**: Security headers and content security policy
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: Request rate limiting per IP
- **Input Validation**: Request parameter validation
- **Error Sanitization**: Safe error message handling

## 📝 Logging

Logs are written to `logs/app.log` with the following levels:
- `DEBUG`: Detailed debugging information
- `INFO`: General application information
- `WARN`: Warning messages
- `ERROR`: Error messages with stack traces

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## 📦 Dependencies

### Core Dependencies
- `express`: Web framework
- `sqlite3`: Database operations
- `cors`: Cross-origin resource sharing
- `helmet`: Security middleware
- `express-rate-limit`: Rate limiting
- `compression`: Response compression
- `morgan`: HTTP request logging

### Development Dependencies
- `nodemon`: Development server
- `jest`: Testing framework
- `supertest`: API testing
- `eslint`: Code linting

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

1. **Database not found**: Ensure the database file exists in the correct location
2. **Port already in use**: Change the port in configuration or kill the existing process
3. **CORS errors**: Configure CORS settings in the configuration file
4. **Rate limiting**: Adjust rate limit settings for your use case

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development npm run dev
```

### Database Connection Issues

Check database file permissions and path:

```bash
ls -la data/grqaser.db
sqlite3 data/grqaser.db "SELECT COUNT(*) FROM books;"
```

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs in `logs/app.log`
3. Create an issue in the repository
4. Check the API documentation

## 🔗 Related Applications

- **Crawler**: [Grqaser Crawler](../crawler/) - Data collection application
- **Mobile App**: [Grqaser Mobile App](../GrqaserApp/) - React Native mobile application
