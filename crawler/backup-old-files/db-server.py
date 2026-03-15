#!/usr/bin/env python3
"""
Simple Flask server to view GRQASER database data
Provides a web interface to explore books, authors, and crawling data
"""

from flask import Flask, render_template_string, jsonify, request
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)

def get_db_connection():
    """Get database connection"""
    db_path = os.path.join(os.path.dirname(__file__), 'grqaser.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def format_duration(seconds):
    """Format duration in seconds to human readable format"""
    if seconds is None:
        return None
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    if hours > 0:
        return f"{hours}h {minutes}m"
    else:
        return f"{minutes}m"

@app.route('/')
def index():
    """Serve the main HTML page"""
    html_path = os.path.join(os.path.dirname(__file__), 'db-viewer.html')
    with open(html_path, 'r', encoding='utf-8') as f:
        return f.read()

@app.route('/api/overview')
def api_overview():
    """Get overview statistics"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get basic counts
        cursor.execute("SELECT COUNT(*) as count FROM books")
        total_books = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM authors")
        total_authors = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM books WHERE main_audio_url IS NOT NULL AND main_audio_url != ''")
        books_with_audio = cursor.fetchone()['count']
        
        # Check if url_queue table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='url_queue'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as count FROM url_queue WHERE status = 'pending'")
            pending_urls = cursor.fetchone()['count']
        else:
            pending_urls = 0
        
        # Get recent books
        cursor.execute("""
            SELECT id, title, author, duration, crawl_status, created_at
            FROM books 
            ORDER BY created_at DESC
            LIMIT 10
        """)
        recent_books = []
        for row in cursor.fetchall():
            recent_books.append({
                'id': row['id'],
                'title': row['title'],
                'author': row['author'],
                'duration': format_duration(row['duration']),
                'crawl_status': row['crawl_status'],
                'created_at': row['created_at']
            })
        
        return jsonify({
            'totalBooks': total_books,
            'totalAuthors': total_authors,
            'booksWithAudio': books_with_audio,
            'pendingUrls': pending_urls,
            'recentBooks': recent_books
        })
        
    finally:
        conn.close()

@app.route('/api/books')
def api_books():
    """Get all books"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT id, title, author, duration, rating, category, language, 
                   crawl_status, created_at, main_audio_url
            FROM books 
            ORDER BY title
        """)
        
        books = []
        for row in cursor.fetchall():
            books.append({
                'id': row['id'],
                'title': row['title'],
                'author': row['author'],
                'duration': row['duration'],
                'rating': row['rating'],
                'category': row['category'],
                'language': row['language'],
                'crawl_status': row['crawl_status'],
                'created_at': row['created_at'],
                'has_audio': bool(row['main_audio_url'])
            })
        
        return jsonify(books)
        
    finally:
        conn.close()

@app.route('/api/authors')
def api_authors():
    """Get all authors"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT id, name, bio, book_count, created_at
            FROM authors 
            ORDER BY name
        """)
        
        authors = []
        for row in cursor.fetchall():
            authors.append({
                'id': row['id'],
                'name': row['name'],
                'bio': row['bio'],
                'book_count': row['book_count'],
                'created_at': row['created_at']
            })
        
        return jsonify(authors)
        
    finally:
        conn.close()

@app.route('/api/queue')
def api_queue():
    """Get URL queue data"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if url_queue table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='url_queue'")
        if not cursor.fetchone():
            return jsonify([])
        
        cursor.execute("""
            SELECT id, url, url_type, priority, status, retry_count, 
                   error_message, books_found, books_saved, 
                   created_at, completed_at
            FROM url_queue 
            ORDER BY created_at DESC
        """)
        
        queue_items = []
        for row in cursor.fetchall():
            queue_items.append({
                'id': row['id'],
                'url': row['url'],
                'url_type': row['url_type'],
                'priority': row['priority'],
                'status': row['status'],
                'retry_count': row['retry_count'],
                'error_message': row['error_message'],
                'books_found': row['books_found'],
                'books_saved': row['books_saved'],
                'created_at': row['created_at'],
                'completed_at': row['completed_at']
            })
        
        return jsonify(queue_items)
        
    finally:
        conn.close()

@app.route('/api/search')
def api_search():
    """Search books by title or author"""
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT id, title, author, duration, rating, category, crawl_status
            FROM books 
            WHERE title LIKE ? OR author LIKE ?
            ORDER BY title
            LIMIT 50
        """, (f'%{query}%', f'%{query}%'))
        
        results = []
        for row in cursor.fetchall():
            results.append({
                'id': row['id'],
                'title': row['title'],
                'author': row['author'],
                'duration': format_duration(row['duration']),
                'rating': row['rating'],
                'category': row['category'],
                'crawl_status': row['crawl_status']
            })
        
        return jsonify(results)
        
    finally:
        conn.close()

@app.route('/api/book/<book_id>')
def api_book_detail(book_id):
    """Get detailed book information"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get book details
        cursor.execute("""
            SELECT id, title, author, description, duration, type, language, 
                   category, rating, rating_count, cover_image_url, main_audio_url,
                   download_url, file_size, published_at, created_at, crawl_status
            FROM books 
            WHERE id = ?
        """, (book_id,))
        
        book = cursor.fetchone()
        if not book:
            return jsonify({'error': 'Book not found'}), 404
        
        # Get chapters if any
        cursor.execute("""
            SELECT id, title, chapter_number, duration, audio_url, download_url
            FROM chapters 
            WHERE book_id = ?
            ORDER BY chapter_number
        """, (book_id,))
        
        chapters = []
        for row in cursor.fetchall():
            chapters.append({
                'id': row['id'],
                'title': row['title'],
                'chapter_number': row['chapter_number'],
                'duration': format_duration(row['duration']),
                'audio_url': row['audio_url'],
                'download_url': row['download_url']
            })
        
        book_data = {
            'id': book['id'],
            'title': book['title'],
            'author': book['author'],
            'description': book['description'],
            'duration': format_duration(book['duration']),
            'type': book['type'],
            'language': book['language'],
            'category': book['category'],
            'rating': book['rating'],
            'rating_count': book['rating_count'],
            'cover_image_url': book['cover_image_url'],
            'main_audio_url': book['main_audio_url'],
            'download_url': book['download_url'],
            'file_size': book['file_size'],
            'published_at': book['published_at'],
            'created_at': book['created_at'],
            'crawl_status': book['crawl_status'],
            'chapters': chapters
        }
        
        return jsonify(book_data)
        
    finally:
        conn.close()

@app.route('/api/stats')
def api_stats():
    """Get detailed statistics"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Books by status
        cursor.execute("SELECT crawl_status, COUNT(*) as count FROM books GROUP BY crawl_status")
        status_stats = {row['crawl_status']: row['count'] for row in cursor.fetchall()}
        
        # Books by category
        cursor.execute("""
            SELECT category, COUNT(*) as count 
            FROM books 
            WHERE category IS NOT NULL 
            GROUP BY category 
            ORDER BY count DESC 
            LIMIT 10
        """)
        category_stats = {row['category']: row['count'] for row in cursor.fetchall()}
        
        # Books by language
        cursor.execute("""
            SELECT language, COUNT(*) as count 
            FROM books 
            GROUP BY language 
            ORDER BY count DESC
        """)
        language_stats = {row['language']: row['count'] for row in cursor.fetchall()}
        
        # Average duration
        cursor.execute("SELECT AVG(duration) as avg_duration FROM books WHERE duration IS NOT NULL")
        avg_duration = cursor.fetchone()['avg_duration']
        
        # Total duration
        cursor.execute("SELECT SUM(duration) as total_duration FROM books WHERE duration IS NOT NULL")
        total_duration = cursor.fetchone()['total_duration']
        
        return jsonify({
            'statusStats': status_stats,
            'categoryStats': category_stats,
            'languageStats': language_stats,
            'avgDuration': format_duration(int(avg_duration)) if avg_duration else None,
            'totalDuration': format_duration(int(total_duration)) if total_duration else None
        })
        
    finally:
        conn.close()

if __name__ == '__main__':
    print("🚀 Starting GRQASER Database Viewer Server...")
    print("📊 Open your browser and go to: http://localhost:5001")
    print("⏹️  Press Ctrl+C to stop the server")
    print("-" * 50)
    
    app.run(debug=True, host='0.0.0.0', port=5001)
