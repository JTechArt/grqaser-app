# 📚 GRQASER Database Viewer

A simple web interface to explore and view your GRQASER audiobook database data.

## Features

- **Overview Dashboard**: View key statistics and recent books
- **Books Browser**: Search and browse all books with pagination
- **Authors List**: View all authors and their book counts
- **URL Queue Monitor**: Track crawling progress and status
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Search**: Filter books and authors instantly

## Quick Start

### Prerequisites

- Python 3.6 or higher
- GRQASER database file (`grqaser.db`)

### Installation & Setup

1. **Navigate to the data directory**:
   ```bash
   cd crawler/data
   ```

2. **Run the startup script**:
   ```bash
   ./start-db-viewer.sh
   ```

   Or manually:
   ```bash
   # Install dependencies
   pip3 install -r requirements.txt
   
   # Start the server
   python3 db-server.py
   ```

3. **Open your browser** and go to:
   ```
   http://localhost:5000
   ```

## Usage

### Overview Tab
- View total books, authors, and pending URLs
- See recent books added to the database
- Monitor crawling statistics

### Books Tab
- Browse all books in the database
- Search by title or author name
- View book details including:
  - Duration and rating
  - Category and language
  - Crawl status
  - Audio availability

### Authors Tab
- List all authors in the database
- Search authors by name
- View author bio and book count

### URL Queue Tab
- Monitor crawling progress
- View pending, completed, and failed URLs
- Track books found and saved per URL

## API Endpoints

The server provides the following API endpoints:

- `GET /api/overview` - Overview statistics
- `GET /api/books` - All books
- `GET /api/authors` - All authors
- `GET /api/queue` - URL queue data
- `GET /api/search?q=<query>` - Search books
- `GET /api/book/<id>` - Book details
- `GET /api/stats` - Detailed statistics

## Database Schema

The viewer works with the following tables:

### Books Table
- `id` - Unique book identifier
- `title` - Book title
- `author` - Book author
- `description` - Book description
- `duration` - Audio duration in seconds
- `rating` - Book rating
- `category` - Book category
- `language` - Book language
- `main_audio_url` - Main audio file URL
- `crawl_status` - Crawling status (pending, completed, failed)

### Authors Table
- `id` - Unique author identifier
- `name` - Author name
- `bio` - Author biography
- `book_count` - Number of books by this author

### URL Queue Table
- `id` - Queue item identifier
- `url` - URL to crawl
- `url_type` - Type of URL (page, book_detail, etc.)
- `status` - Processing status
- `books_found` - Number of books found
- `books_saved` - Number of books saved

## Troubleshooting

### Common Issues

1. **Database not found**:
   - Ensure `grqaser.db` exists in the `crawler/data` directory
   - Run the crawler first to generate the database

2. **Port already in use**:
   - Change the port in `db-server.py` (line 280)
   - Or kill the process using port 5000

3. **Flask not installed**:
   - Run: `pip3 install -r requirements.txt`

4. **Permission denied**:
   - Make the startup script executable: `chmod +x start-db-viewer.sh`

### Error Messages

- **"Book not found"**: The book ID doesn't exist in the database
- **"No books found"**: Search query returned no results
- **"Database connection failed"**: Check if `grqaser.db` exists and is readable

## Development

### Adding New Features

1. **New API endpoint**: Add route in `db-server.py`
2. **Frontend changes**: Modify `db-viewer.html`
3. **Styling**: Update CSS in the HTML file

### Customization

- **Port**: Change `port=5000` in `db-server.py`
- **Host**: Change `host='0.0.0.0'` to `'127.0.0.1'` for local-only access
- **Items per page**: Modify `itemsPerPage` in the JavaScript

## Security Notes

- This is a development tool, not for production use
- The server runs on all interfaces (`0.0.0.0`) by default
- No authentication is implemented
- Database is read-only through this interface

## Contributing

To add new features or fix issues:

1. Modify the relevant files
2. Test the changes locally
3. Update this documentation
4. Commit with descriptive messages

---

**Happy browsing! 📖✨**
