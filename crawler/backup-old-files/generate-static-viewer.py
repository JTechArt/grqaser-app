#!/usr/bin/env python3
"""
Generate a static HTML viewer with real database data
"""

import sqlite3
import os
from datetime import datetime

def get_db_connection():
    """Get database connection"""
    db_path = os.path.join(os.path.dirname(__file__), 'grqaser.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def format_duration(seconds):
    """Format duration in seconds to human readable format"""
    if seconds is None:
        return "N/A"
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    if hours > 0:
        return f"{hours}h {minutes}m"
    else:
        return f"{minutes}m"

def generate_html():
    """Generate static HTML with real database data"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get statistics
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
            
            cursor.execute("SELECT COUNT(*) as count FROM url_queue WHERE status = 'completed'")
            completed_urls = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM url_queue WHERE status = 'failed'")
            failed_urls = cursor.fetchone()['count']
        else:
            pending_urls = completed_urls = failed_urls = 0
        
        # Get recent books
        cursor.execute("""
            SELECT id, title, author, duration, rating, category, language, crawl_status, created_at
            FROM books 
            ORDER BY created_at DESC
            LIMIT 20
        """)
        recent_books = []
        for row in cursor.fetchall():
            recent_books.append({
                'id': row['id'],
                'title': row['title'],
                'author': row['author'],
                'duration': row['duration'],
                'rating': row['rating'],
                'category': row['category'],
                'language': row['language'],
                'crawl_status': row['crawl_status'],
                'created_at': row['created_at']
            })
        
        # Get books by status
        cursor.execute("SELECT crawl_status, COUNT(*) as count FROM books GROUP BY crawl_status")
        status_stats = {row['crawl_status']: row['count'] for row in cursor.fetchall()}
        
        # Get books by category
        cursor.execute("""
            SELECT category, COUNT(*) as count 
            FROM books 
            WHERE category IS NOT NULL 
            GROUP BY category 
            ORDER BY count DESC 
            LIMIT 10
        """)
        category_stats = {row['category']: row['count'] for row in cursor.fetchall()}
        
        # Generate the HTML
        html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GRQASER Database Viewer - Real Data</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}

        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }}

        .header {{
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}

        .header h1 {{
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }}

        .header p {{
            font-size: 1.1rem;
            opacity: 0.9;
        }}

        .content {{
            padding: 30px;
        }}

        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}

        .stat-card {{
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #4f46e5;
        }}

        .stat-number {{
            font-size: 2rem;
            font-weight: 700;
            color: #4f46e5;
            margin-bottom: 5px;
        }}

        .stat-label {{
            color: #64748b;
            font-size: 0.9rem;
        }}

        .section {{
            margin-bottom: 40px;
        }}

        .section h2 {{
            color: #1f2937;
            margin-bottom: 20px;
            font-size: 1.5rem;
        }}

        .data-table {{
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }}

        .data-table th {{
            background: #f8fafc;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
        }}

        .data-table td {{
            padding: 15px;
            border-bottom: 1px solid #f3f4f6;
            color: #374151;
        }}

        .data-table tr:hover {{
            background: #f9fafb;
        }}

        .book-card {{
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }}

        .book-card:hover {{
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }}

        .book-title {{
            font-size: 1.2rem;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 8px;
        }}

        .book-author {{
            color: #6b7280;
            margin-bottom: 10px;
        }}

        .book-meta {{
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            font-size: 0.9rem;
            color: #6b7280;
        }}

        .book-meta span {{
            display: flex;
            align-items: center;
            gap: 5px;
        }}

        .status-badge {{
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
        }}

        .status-pending {{ background: #fef3c7; color: #92400e; }}
        .status-completed {{ background: #d1fae5; color: #065f46; }}
        .status-failed {{ background: #fee2e2; color: #991b1b; }}

        .info-box {{
            background: #dbeafe;
            color: #1e40af;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }}

        .chart-container {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}

        .chart {{
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
        }}

        .chart h3 {{
            margin-bottom: 15px;
            color: #374151;
        }}

        .chart-item {{
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }}

        .chart-item:last-child {{
            border-bottom: none;
        }}

        @media (max-width: 768px) {{
            .header h1 {{
                font-size: 2rem;
            }}
            
            .stats-grid {{
                grid-template-columns: 1fr;
            }}
            
            .book-meta {{
                flex-direction: column;
                gap: 5px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 GRQASER Database Viewer</h1>
            <p>Real database data - Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>

        <div class="content">
            <div class="info-box">
                <strong>📊 Database Overview:</strong> This page shows real data from your GRQASER database. 
                The data was extracted on {datetime.now().strftime('%Y-%m-%d at %H:%M:%S')}.
            </div>

            <div class="section">
                <h2>📊 Database Statistics</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">{total_books}</div>
                        <div class="stat-label">Total Books</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">{total_authors}</div>
                        <div class="stat-label">Authors</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">{books_with_audio}</div>
                        <div class="stat-label">Books with Audio</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">{pending_urls}</div>
                        <div class="stat-label">Pending URLs</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>📈 Data Breakdown</h2>
                <div class="chart-container">
                    <div class="chart">
                        <h3>Books by Status</h3>
                        {''.join([f'<div class="chart-item"><span>{status}</span><span>{count}</span></div>' for status, count in status_stats.items()])}
                    </div>
                    <div class="chart">
                        <h3>Books by Category</h3>
                        {''.join([f'<div class="chart-item"><span>{category}</span><span>{count}</span></div>' for category, count in category_stats.items()])}
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>📚 Recent Books (Last 20)</h2>
                <div id="books-content">
                                         {chr(10).join([f'''
                     <div class="book-card">
                         <div class="book-title">{book['title']}</div>
                         <div class="book-author">by {book['author']}</div>
                         <div class="book-meta">
                             <span>Duration: {format_duration(book['duration'])}</span>
                             <span>Rating: {book['rating'] or 'N/A'}</span>
                             <span>Category: {book['category'] or 'N/A'}</span>
                             <span>Language: {book['language'] or 'N/A'}</span>
                             <span class="status-badge status-{book['crawl_status']}">{book['crawl_status']}</span>
                         </div>
                     </div>
                     ''' for book in recent_books])}
                </div>
            </div>

            <div class="section">
                <h2>🔗 URL Queue Status</h2>
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Count</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><span class="status-badge status-pending">Pending</span></td>
                                <td>{pending_urls}</td>
                                <td>URLs waiting to be processed</td>
                            </tr>
                            <tr>
                                <td><span class="status-badge status-completed">Completed</span></td>
                                <td>{completed_urls}</td>
                                <td>URLs successfully processed</td>
                            </tr>
                            <tr>
                                <td><span class="status-badge status-failed">Failed</span></td>
                                <td>{failed_urls}</td>
                                <td>URLs that failed to process</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</body>
</html>'''
        
        # Write the HTML file
        output_path = os.path.join(os.path.dirname(__file__), 'grqaser-db-viewer.html')
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"✅ Generated static HTML viewer: {output_path}")
        print(f"📊 Database stats: {total_books} books, {total_authors} authors, {pending_urls} pending URLs")
        print(f"🌐 Open the file in your browser to view the data")
        
    finally:
        conn.close()

if __name__ == "__main__":
    generate_html()
