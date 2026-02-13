# Database Viewer API - cURL Examples

## Overview
This document provides cURL examples for interacting with the Database Viewer API endpoints. The API is designed to provide access to crawled audiobook data with filtering, search, and monitoring capabilities.

## Base URL
```
http://localhost:3001/api/v1
```

## Authentication
Currently, the API uses simple API key authentication:
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3001/api/v1/books
```

## Books Endpoints

### 1. Get All Books
```bash
# Basic request
curl -X GET "http://localhost:3001/api/v1/books"

# With pagination
curl -X GET "http://localhost:3001/api/v1/books?page=1&limit=20"

# With sorting
curl -X GET "http://localhost:3001/api/v1/books?sort=title&order=asc"

# Response example
{
  "success": true,
  "data": {
    "books": [
      {
        "id": 1079,
        "title": "Թալինթ Պֆեսթ",
        "author": "Գևորգ Տեր-Գաբրիելյան",
        "duration": 36540,
        "duration_formatted": "10h 7m",
        "rating": null,
        "category": "Unknown",
        "language": "hy",
        "crawl_status": "discovered",
        "created_at": "2025-08-30T16:32:20.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 24,
      "pages": 2
    }
  }
}
```

### 2. Get Book by ID
```bash
curl -X GET "http://localhost:3001/api/v1/books/1079"

# Response example
{
  "success": true,
  "data": {
    "id": 1079,
    "title": "Թալինթ Պֆեսթ",
    "author": "Գևորգ Տեր-Գաբրիելյան",
    "description": "Book description...",
    "duration": 36540,
    "duration_formatted": "10h 7m",
    "rating": null,
    "rating_count": null,
    "category": "Unknown",
    "language": "hy",
    "cover_image_url": null,
    "main_audio_url": null,
    "download_url": null,
    "file_size": null,
    "published_at": null,
    "crawl_status": "discovered",
    "has_chapters": false,
    "chapter_count": 0,
    "created_at": "2025-08-30T16:32:20.000Z",
    "updated_at": "2025-08-30T16:32:20.000Z"
  }
}
```

### 3. Search Books
```bash
# Search by title
curl -X GET "http://localhost:3001/api/v1/books/search?q=Թալինթ"

# Search by author
curl -X GET "http://localhost:3001/api/v1/books/search?author=Գևորգ"

# Search with multiple criteria
curl -X GET "http://localhost:3001/api/v1/books/search?q=Թալինթ&author=Գևորգ&category=Unknown"
```

### 4. Filter Books
```bash
# Filter by author
curl -X GET "http://localhost:3001/api/v1/books?author=Գևորգ%20Տեր-Գաբրիելյան"

# Filter by category
curl -X GET "http://localhost:3001/api/v1/books?category=Unknown"

# Filter by duration range (in seconds)
curl -X GET "http://localhost:3001/api/v1/books?duration_min=3600&duration_max=7200"

# Filter by crawl status
curl -X GET "http://localhost:3001/api/v1/books?crawl_status=discovered"

# Multiple filters
curl -X GET "http://localhost:3001/api/v1/books?author=Գևորգ&category=Unknown&duration_min=3600"
```

## Crawler Status Endpoints

### 1. Get Crawler Status
```bash
curl -X GET "http://localhost:3001/api/v1/crawler/status"

# Response example
{
  "success": true,
  "data": {
    "is_running": false,
    "last_run": "2025-08-30T16:32:20.000Z",
    "total_books": 24,
    "discovered_books": 24,
    "processed_books": 0,
    "failed_books": 0,
    "pending_urls": 0,
    "processing_urls": 0,
    "completed_urls": 0,
    "failed_urls": 0
  }
}
```

### 2. Get URL Queue Status
```bash
curl -X GET "http://localhost:3001/api/v1/crawler/urls"

# With filtering
curl -X GET "http://localhost:3001/api/v1/crawler/urls?status=pending"

# Response example
{
  "success": true,
  "data": {
    "urls": [
      {
        "id": 1,
        "url": "https://grqaser.org/book/1079",
        "url_type": "book_detail",
        "priority": 1,
        "status": "pending",
        "retry_count": 0,
        "error_message": null,
        "created_at": "2025-08-30T16:32:20.000Z"
      }
    ],
    "summary": {
      "total": 24,
      "pending": 24,
      "processing": 0,
      "completed": 0,
      "failed": 0
    }
  }
}
```

### 3. Get Crawler Logs
```bash
# Get recent logs
curl -X GET "http://localhost:3001/api/v1/crawler/logs"

# Get logs with filtering
curl -X GET "http://localhost:3001/api/v1/crawler/logs?level=error&limit=50"

# Response example
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "level": "INFO",
        "message": "Crawler started successfully",
        "timestamp": "2025-08-30T16:32:20.000Z",
        "book_id": null,
        "url": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

## Statistics Endpoints

### 1. Get Overall Statistics
```bash
curl -X GET "http://localhost:3001/api/v1/stats/overview"

# Response example
{
  "success": true,
  "data": {
    "books": {
      "total": 24,
      "by_status": {
        "discovered": 24,
        "processing": 0,
        "completed": 0,
        "failed": 0
      },
      "by_category": {
        "Unknown": 24
      },
      "by_language": {
        "hy": 24
      }
    },
    "authors": {
      "total": 15,
      "top_authors": [
        {
          "author": "Գևորգ Տեր-Գաբրիելյան",
          "book_count": 3
        }
      ]
    },
    "duration": {
      "average": 7200,
      "min": 720,
      "max": 86400,
      "total_hours": 48
    }
  }
}
```

### 2. Get Author Statistics
```bash
curl -X GET "http://localhost:3001/api/v1/stats/authors"

# Response example
{
  "success": true,
  "data": {
    "authors": [
      {
        "author": "Գևորգ Տեր-Գաբրիելյան",
        "book_count": 3,
        "total_duration": 21600,
        "average_duration": 7200
      }
    ]
  }
}
```

### 3. Get Category Statistics
```bash
curl -X GET "http://localhost:3001/api/v1/stats/categories"

# Response example
{
  "success": true,
  "data": {
    "categories": [
      {
        "category": "Unknown",
        "book_count": 24,
        "total_duration": 172800
      }
    ]
  }
}
```

## Export Endpoints

### 1. Export Books Data
```bash
# Export as JSON
curl -X GET "http://localhost:3001/api/v1/export/books?format=json" \
  -H "Accept: application/json" \
  --output books.json

# Export as CSV
curl -X GET "http://localhost:3001/api/v1/export/books?format=csv" \
  -H "Accept: text/csv" \
  --output books.csv

# Export with filters
curl -X GET "http://localhost:3001/api/v1/export/books?format=json&author=Գևորգ" \
  --output filtered_books.json
```

### 2. Export Crawler Logs
```bash
# Export logs as JSON
curl -X GET "http://localhost:3001/api/v1/export/logs?format=json&level=error" \
  --output error_logs.json
```

## Health Check

### 1. API Health Status
```bash
curl -X GET "http://localhost:3001/api/v1/health"

# Response example
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-08-30T16:32:20.000Z",
    "version": "1.0.0",
    "database": "connected",
    "uptime": 3600
  }
}
```

## Error Handling

### Error Response Format
```bash
# Example error response
{
  "success": false,
  "error": {
    "code": "BOOK_NOT_FOUND",
    "message": "Book with ID 9999 not found",
    "details": {
      "book_id": 9999
    }
  }
}
```

### Common Error Codes
- `BOOK_NOT_FOUND`: Book with specified ID doesn't exist
- `INVALID_FILTER`: Invalid filter parameter provided
- `DATABASE_ERROR`: Database connection or query error
- `VALIDATION_ERROR`: Request validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests

## Rate Limiting

The API implements rate limiting:
- **Default**: 100 requests per minute per IP
- **Headers**: Rate limit information is included in response headers
```bash
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

All list endpoints support pagination:
```bash
# Pagination parameters
?page=1&limit=20

# Pagination response
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```
