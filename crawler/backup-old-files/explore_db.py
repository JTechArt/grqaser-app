#!/usr/bin/env python3
"""
Database Explorer for grqaser.db
A simple tool to explore the crawled audiobook data
"""

import sqlite3
import sys
from datetime import datetime

def connect_db():
    """Connect to the database"""
    try:
        conn = sqlite3.connect('grqaser.db')
        conn.row_factory = sqlite3.Row  # This allows accessing columns by name
        return conn
    except sqlite3.Error as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def format_duration(seconds):
    """Format duration in seconds to human readable format"""
    if seconds is None:
        return "Unknown"
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    if hours > 0:
        return f"{hours}h {minutes}m"
    else:
        return f"{minutes}m"

def show_summary(conn):
    """Show database summary"""
    print("=" * 60)
    print("📚 GRQASER DATABASE SUMMARY")
    print("=" * 60)
    
    cursor = conn.cursor()
    
    # Count records in each table
    tables = ['books', 'chapters', 'authors', 'categories', 'book_authors']
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
        count = cursor.fetchone()['count']
        print(f"📖 {table.capitalize()}: {count} records")
    
    # Check if url_queue table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='url_queue'")
    if cursor.fetchone():
        cursor.execute("SELECT COUNT(*) as count FROM url_queue")
        url_count = cursor.fetchone()['count']
        print(f"🔗 URL Queue: {url_count} records")
        
        # URL queue status
        cursor.execute("""
            SELECT status, COUNT(*) as count, 
                   SUM(books_found) as total_found,
                   SUM(books_saved) as total_saved
            FROM url_queue 
            GROUP BY status
            ORDER BY count DESC
        """)
        url_statuses = cursor.fetchall()
        print(f"\n🔗 URL QUEUE STATUS:")
        for status in url_statuses:
            print(f"   {status['status']}: {status['count']} URLs")
            if status['total_found']:
                print(f"     📖 Books found: {status['total_found']}")
            if status['total_saved']:
                print(f"     💾 Books saved: {status['total_saved']}")
    
    # Books statistics
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN main_audio_url IS NOT NULL AND main_audio_url != '' THEN 1 END) as with_audio,
            COUNT(CASE WHEN rating IS NOT NULL THEN 1 END) as with_rating,
            AVG(duration) as avg_duration
        FROM books
    """)
    stats = cursor.fetchone()
    
    print(f"\n📊 BOOKS STATISTICS:")
    print(f"   Total books: {stats['total']}")
    print(f"   Books with audio: {stats['with_audio']}")
    print(f"   Books with rating: {stats['with_rating']}")
    if stats['avg_duration']:
        print(f"   Average duration: {format_duration(int(stats['avg_duration']))}")
    
    # Crawl status
    cursor.execute("SELECT crawl_status, COUNT(*) as count FROM books GROUP BY crawl_status")
    statuses = cursor.fetchall()
    print(f"\n🔄 CRAWL STATUS:")
    for status in statuses:
        print(f"   {status['crawl_status']}: {status['count']} books")

def show_books(conn, limit=10, order_by='title'):
    """Show books with details"""
    print(f"\n📚 BOOKS (showing first {limit}, ordered by {order_by})")
    print("-" * 80)
    
    cursor = conn.cursor()
    cursor.execute(f"""
        SELECT id, title, author, duration, rating, category, language, 
               main_audio_url, created_at
        FROM books 
        ORDER BY {order_by}
        LIMIT {limit}
    """)
    
    books = cursor.fetchall()
    
    for book in books:
        print(f"ID: {book['id']}")
        print(f"Title: {book['title']}")
        print(f"Author: {book['author']}")
        print(f"Duration: {format_duration(book['duration'])}")
        print(f"Rating: {book['rating'] or 'N/A'}")
        print(f"Category: {book['category']}")
        print(f"Language: {book['language']}")
        print(f"Has Audio: {'Yes' if book['main_audio_url'] else 'No'}")
        print(f"Created: {book['created_at']}")
        print("-" * 40)

def search_books(conn, search_term):
    """Search books by title or author"""
    print(f"\n🔍 SEARCH RESULTS for '{search_term}'")
    print("-" * 60)
    
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, author, duration, rating, category
        FROM books 
        WHERE title LIKE ? OR author LIKE ?
        ORDER BY title
    """, (f'%{search_term}%', f'%{search_term}%'))
    
    books = cursor.fetchall()
    
    if not books:
        print("No books found matching your search term.")
        return
    
    for book in books:
        print(f"📖 {book['title']} by {book['author']}")
        print(f"   Duration: {format_duration(book['duration'])} | Rating: {book['rating'] or 'N/A'}")
        print(f"   Category: {book['category']} | ID: {book['id']}")
        print()

def show_longest_books(conn, limit=5):
    """Show the longest books"""
    print(f"\n⏱️  LONGEST BOOKS (top {limit})")
    print("-" * 60)
    
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, author, duration, rating
        FROM books 
        WHERE duration IS NOT NULL
        ORDER BY duration DESC
        LIMIT ?
    """, (limit,))
    
    books = cursor.fetchall()
    
    for i, book in enumerate(books, 1):
        print(f"{i}. {book['title']} by {book['author']}")
        print(f"   Duration: {format_duration(book['duration'])} | Rating: {book['rating'] or 'N/A'}")
        print(f"   ID: {book['id']}")
        print()

def show_url_queue_status(conn, limit=10):
    """Show URL queue status and details"""
    cursor = conn.cursor()
    
    # Check if url_queue table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='url_queue'")
    if not cursor.fetchone():
        print("❌ URL queue table not found. Run the crawler first to create it.")
        return
    
    print(f"\n🔗 === URL QUEUE STATUS (showing first {limit}) ===")
    
    # Show pending URLs
    cursor.execute("""
        SELECT id, url, url_type, priority, created_at, retry_count
        FROM url_queue 
        WHERE status IN ('pending', 'retry')
        ORDER BY priority DESC, created_at ASC
        LIMIT ?
    """, (limit,))
    
    pending_urls = cursor.fetchall()
    if pending_urls:
        print(f"\n⏳ PENDING URLS ({len(pending_urls)}):")
        for url in pending_urls:
            print(f"  ID: {url['id']} | Priority: {url['priority']} | Type: {url['url_type']}")
            print(f"  URL: {url['url']}")
            print(f"  Created: {url['created_at']} | Retries: {url['retry_count']}")
            print("  " + "-" * 50)
    else:
        print("\n⏳ No pending URLs found.")
    
    # Show failed URLs
    cursor.execute("""
        SELECT id, url, url_type, error_message, retry_count, created_at
        FROM url_queue 
        WHERE status = 'failed'
        ORDER BY created_at DESC
        LIMIT ?
    """, (limit,))
    
    failed_urls = cursor.fetchall()
    if failed_urls:
        print(f"\n❌ FAILED URLS ({len(failed_urls)}):")
        for url in failed_urls:
            print(f"  ID: {url['id']} | Type: {url['url_type']} | Retries: {url['retry_count']}")
            print(f"  URL: {url['url']}")
            print(f"  Error: {url['error_message'] or 'Unknown error'}")
            print(f"  Created: {url['created_at']}")
            print("  " + "-" * 50)
    else:
        print("\n❌ No failed URLs found.")
    
    # Show completed URLs
    cursor.execute("""
        SELECT id, url, url_type, books_found, books_saved, completed_at
        FROM url_queue 
        WHERE status = 'completed'
        ORDER BY completed_at DESC
        LIMIT ?
    """, (limit,))
    
    completed_urls = cursor.fetchall()
    if completed_urls:
        print(f"\n✅ COMPLETED URLS ({len(completed_urls)}):")
        for url in completed_urls:
            print(f"  ID: {url['id']} | Type: {url['url_type']}")
            print(f"  URL: {url['url']}")
            print(f"  Books: Found {url['books_found']}, Saved {url['books_saved']}")
            print(f"  Completed: {url['completed_at']}")
            print("  " + "-" * 50)
    else:
        print("\n✅ No completed URLs found.")

def main():
    """Main function"""
    conn = connect_db()
    
    while True:
        print("\n" + "=" * 60)
        print("🔍 GRQASER DATABASE EXPLORER")
        print("=" * 60)
        print("1. Show database summary")
        print("2. Show all books (first 10)")
        print("3. Show longest books")
        print("4. Search books")
        print("5. Show books by recent creation")
        print("6. Show books by duration")
        print("7. Show URL queue status")
        print("0. Exit")
        
        choice = input("\nEnter your choice (0-7): ").strip()
        
        if choice == '0':
            print("Goodbye! 👋")
            break
        elif choice == '1':
            show_summary(conn)
        elif choice == '2':
            show_books(conn, 10, 'title')
        elif choice == '3':
            show_longest_books(conn, 5)
        elif choice == '4':
            search_term = input("Enter search term: ").strip()
            if search_term:
                search_books(conn, search_term)
        elif choice == '5':
            show_books(conn, 10, 'created_at DESC')
        elif choice == '6':
            show_books(conn, 10, 'duration DESC')
        elif choice == '7':
            limit = input("How many URLs to show (default 10): ").strip()
            show_url_queue_status(conn, int(limit) if limit.isdigit() else 10)
        else:
            print("Invalid choice. Please try again.")
    
    conn.close()

if __name__ == "__main__":
    main()
