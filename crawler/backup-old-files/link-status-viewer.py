#!/usr/bin/env python3
"""
Link Status Viewer Generator
Shows the status of URL queue and crawl links processing
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

def format_date(date_string):
    """Format date string"""
    if not date_string:
        return "N/A"
    try:
        return datetime.fromisoformat(date_string.replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M')
    except:
        return date_string

def generate_link_status_html():
    """Generate HTML with link processing status"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get URL Queue statistics
        cursor.execute("""
            SELECT status, COUNT(*) as count,
                   SUM(books_found) as total_found,
                   SUM(books_saved) as total_saved
            FROM url_queue 
            GROUP BY status
            ORDER BY count DESC
        """)
        url_queue_stats = []
        for row in cursor.fetchall():
            url_queue_stats.append({
                'status': row['status'],
                'count': row['count'],
                'total_found': row['total_found'] or 0,
                'total_saved': row['total_saved'] or 0
            })
        
        # Get Crawl Links statistics
        cursor.execute("""
            SELECT status, COUNT(*) as count,
                   SUM(books_found) as total_found,
                   SUM(books_saved) as total_saved
            FROM crawl_links 
            GROUP BY status
            ORDER BY count DESC
        """)
        crawl_links_stats = []
        for row in cursor.fetchall():
            crawl_links_stats.append({
                'status': row['status'],
                'count': row['count'],
                'total_found': row['total_found'] or 0,
                'total_saved': row['total_saved'] or 0
            })
        
        # Get recent URL Queue items
        cursor.execute("""
            SELECT id, url, url_type, priority, status, retry_count, 
                   error_message, books_found, books_saved, 
                   created_at, processing_started_at, completed_at
            FROM url_queue 
            ORDER BY created_at DESC
            LIMIT 50
        """)
        recent_url_queue = []
        for row in cursor.fetchall():
            recent_url_queue.append({
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
                'processing_started_at': row['processing_started_at'],
                'completed_at': row['completed_at']
            })
        
        # Get recent Crawl Links
        cursor.execute("""
            SELECT id, book_id, url, status, priority, retry_count, 
                   error_message, books_found, books_saved, 
                   created_at, processing_started_at, completed_at
            FROM crawl_links 
            ORDER BY created_at DESC
            LIMIT 50
        """)
        recent_crawl_links = []
        for row in cursor.fetchall():
            recent_crawl_links.append({
                'id': row['id'],
                'book_id': row['book_id'],
                'url': row['url'],
                'status': row['status'],
                'priority': row['priority'],
                'retry_count': row['retry_count'],
                'error_message': row['error_message'],
                'books_found': row['books_found'],
                'books_saved': row['books_saved'],
                'created_at': row['created_at'],
                'processing_started_at': row['processing_started_at'],
                'completed_at': row['completed_at']
            })
        
        # Get total counts
        cursor.execute("SELECT COUNT(*) as count FROM url_queue")
        total_url_queue = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM crawl_links")
        total_crawl_links = cursor.fetchone()['count']
        
        # Generate the HTML
        html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GRQASER Link Processing Status</title>
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
            max-width: 1400px;
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
        
        .nav-tabs {{
            display: flex;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            margin-bottom: 30px;
        }}
        
        .nav-tab {{
            flex: 1;
            padding: 15px 20px;
            text-align: center;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 1rem;
            font-weight: 500;
            color: #64748b;
            transition: all 0.3s ease;
        }}
        
        .nav-tab.active {{
            background: white;
            color: #4f46e5;
            border-bottom: 3px solid #4f46e5;
        }}
        
        .nav-tab:hover {{
            background: #f1f5f9;
        }}
        
        .tab-content {{
            display: none;
        }}
        
        .tab-content.active {{
            display: block;
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
            font-size: 0.9rem;
        }}
        
        .data-table th {{
            background: #f8fafc;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
        }}
        
        .data-table td {{
            padding: 12px;
            border-bottom: 1px solid #f3f4f6;
            color: #374151;
            word-break: break-word;
        }}
        
        .data-table tr:hover {{
            background: #f9fafb;
        }}
        
        .status-badge {{
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
            text-transform: uppercase;
        }}
        
        .status-pending, .status-new {{
            background: #fef3c7; 
            color: #92400e;
        }}
        
        .status-processing {{
            background: #dbeafe; 
            color: #1e40af;
        }}
        
        .status-completed {{
            background: #d1fae5; 
            color: #065f46;
        }}
        
        .status-failed {{
            background: #fee2e2; 
            color: #991b1b;
        }}
        
        .status-retry {{
            background: #fef3c7; 
            color: #92400e;
        }}
        
        .url-cell {{
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }}
        
        .url-cell:hover {{
            white-space: normal;
            word-break: break-all;
        }}
        
        .info-box {{
            background: #dbeafe;
            color: #1e40af;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }}
        
        @media (max-width: 768px) {{
            .header h1 {{
                font-size: 2rem;
            }}
            
            .nav-tabs {{
                flex-direction: column;
            }}
            
            .stats-grid {{
                grid-template-columns: 1fr;
            }}
            
            .data-table {{
                font-size: 0.8rem;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔗 GRQASER Link Processing Status</h1>
            <p>Monitor URL queue and crawl links processing - Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>

        <div class="content">
            <div class="info-box">
                <strong>📊 Processing Overview:</strong> This page shows the status of all URLs being processed by the crawler. 
                Track pending, processing, completed, and failed links.
                <br><br>
                <strong>📚 Related:</strong> 
                <a href="grqaser-db-viewer.html" style="color: #1e40af; text-decoration: underline;">View Database Overview</a> - 
                See books, authors, and general database statistics.
            </div>

            <div class="nav-tabs">
                <button class="nav-tab active" onclick="showTab('overview')">Overview</button>
                <button class="nav-tab" onclick="showTab('url-queue')">URL Queue</button>
                <button class="nav-tab" onclick="showTab('crawl-links')">Crawl Links</button>
            </div>

            <!-- Overview Tab -->
            <div id="overview" class="tab-content active">
                <div class="section">
                    <h2>📊 Overall Statistics</h2>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-number">{total_url_queue}</div>
                            <div class="stat-label">Total URL Queue Items</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">{total_crawl_links}</div>
                            <div class="stat-label">Total Crawl Links</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">{total_url_queue + total_crawl_links}</div>
                            <div class="stat-label">Total Processing Items</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2>📈 URL Queue Status Breakdown</h2>
                    <div class="data-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Count</th>
                                    <th>Books Found</th>
                                    <th>Books Saved</th>
                                    <th>Success Rate</th>
                                </tr>
                            </thead>
                            <tbody>'''
        
        for stat in url_queue_stats:
            success_rate = "N/A"
            if stat['total_found'] > 0:
                success_rate = f"{(stat['total_saved'] / stat['total_found'] * 100):.1f}%"
            
            html_content += f'''
                                <tr>
                                    <td><span class="status-badge status-{stat['status']}">{stat['status']}</span></td>
                                    <td>{stat['count']}</td>
                                    <td>{stat['total_found']}</td>
                                    <td>{stat['total_saved']}</td>
                                    <td>{success_rate}</td>
                                </tr>'''
        
        html_content += f'''
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="section">
                    <h2>📈 Crawl Links Status Breakdown</h2>
                    <div class="data-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Count</th>
                                    <th>Books Found</th>
                                    <th>Books Saved</th>
                                    <th>Success Rate</th>
                                </tr>
                            </thead>
                            <tbody>'''
        
        for stat in crawl_links_stats:
            success_rate = "N/A"
            if stat['total_found'] > 0:
                success_rate = f"{(stat['total_saved'] / stat['total_found'] * 100):.1f}%"
            
            html_content += f'''
                                <tr>
                                    <td><span class="status-badge status-{stat['status']}">{stat['status']}</span></td>
                                    <td>{stat['count']}</td>
                                    <td>{stat['total_found']}</td>
                                    <td>{stat['total_saved']}</td>
                                    <td>{success_rate}</td>
                                </tr>'''
        
        html_content += f'''
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- URL Queue Tab -->
            <div id="url-queue" class="tab-content">
                <div class="section">
                    <h2>🔗 Recent URL Queue Items (Last 50)</h2>
                    <div class="data-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>URL</th>
                                    <th>Type</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Retries</th>
                                    <th>Books Found</th>
                                    <th>Books Saved</th>
                                    <th>Created</th>
                                    <th>Started</th>
                                    <th>Completed</th>
                                </tr>
                            </thead>
                            <tbody>'''
        
        for item in recent_url_queue:
            html_content += f'''
                                <tr>
                                    <td>{item['id']}</td>
                                    <td class="url-cell" title="{item['url']}">{item['url'][:50]}{'...' if len(item['url']) > 50 else ''}</td>
                                    <td>{item['url_type']}</td>
                                    <td>{item['priority']}</td>
                                    <td><span class="status-badge status-{item['status']}">{item['status']}</span></td>
                                    <td>{item['retry_count']}</td>
                                    <td>{item['books_found']}</td>
                                    <td>{item['books_saved']}</td>
                                    <td>{format_date(item['created_at'])}</td>
                                    <td>{format_date(item['processing_started_at'])}</td>
                                    <td>{format_date(item['completed_at'])}</td>
                                </tr>'''
        
        html_content += f'''
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Crawl Links Tab -->
            <div id="crawl-links" class="tab-content">
                <div class="section">
                    <h2>🔗 Recent Crawl Links (Last 50)</h2>
                    <div class="data-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Book ID</th>
                                    <th>URL</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Retries</th>
                                    <th>Books Found</th>
                                    <th>Books Saved</th>
                                    <th>Created</th>
                                    <th>Started</th>
                                    <th>Completed</th>
                                </tr>
                            </thead>
                            <tbody>'''
        
        for item in recent_crawl_links:
            html_content += f'''
                                <tr>
                                    <td>{item['id']}</td>
                                    <td>{item['book_id']}</td>
                                    <td class="url-cell" title="{item['url']}">{item['url'][:50]}{'...' if len(item['url']) > 50 else ''}</td>
                                    <td>{item['priority']}</td>
                                    <td><span class="status-badge status-{item['status']}">{item['status']}</span></td>
                                    <td>{item['retry_count']}</td>
                                    <td>{item['books_found']}</td>
                                    <td>{item['books_saved']}</td>
                                    <td>{format_date(item['created_at'])}</td>
                                    <td>{format_date(item['processing_started_at'])}</td>
                                    <td>{format_date(item['completed_at'])}</td>
                                </tr>'''
        
        html_content += f'''
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        function showTab(tabName) {{
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {{
                content.classList.remove('active');
            }});
            
            // Remove active class from all tabs
            document.querySelectorAll('.nav-tab').forEach(tab => {{
                tab.classList.remove('active');
            }});
            
            // Show selected tab content
            document.getElementById(tabName).classList.add('active');
            
            // Add active class to clicked tab
            event.target.classList.add('active');
        }}
    </script>
</body>
</html>'''
        
        # Write the HTML file
        output_path = os.path.join(os.path.dirname(__file__), 'link-status-viewer.html')
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"✅ Generated link status viewer: {output_path}")
        print(f"📊 URL Queue: {total_url_queue} items, Crawl Links: {total_crawl_links} items")
        print(f"🌐 Open the file in your browser to view link processing status")
        
    finally:
        conn.close()

if __name__ == "__main__":
    generate_link_status_html()
