#!/bin/bash

echo "📚 GRQASER DATABASE QUICK VIEW"
echo "================================"

echo "📊 Database Summary:"
sqlite3 grqaser.db "SELECT 'Books:' as table_name, COUNT(*) as count FROM books UNION ALL SELECT 'Chapters:', COUNT(*) FROM chapters UNION ALL SELECT 'Authors:', COUNT(*) FROM authors UNION ALL SELECT 'Categories:', COUNT(*) FROM categories;"

echo -e "\n📖 Sample Books (first 3):"
sqlite3 grqaser.db "SELECT id, title, author, CASE WHEN duration IS NOT NULL THEN (duration / 3600) || 'h ' || ((duration % 3600) / 60) || 'm' ELSE 'Unknown' END as duration FROM books ORDER BY title LIMIT 3;"

echo -e "\n⏱️  Longest Books:"
sqlite3 grqaser.db "SELECT title, author, (duration / 3600) || 'h ' || ((duration % 3600) / 60) || 'm' as duration FROM books WHERE duration IS NOT NULL ORDER BY duration DESC LIMIT 3;"

echo -e "\n🔄 Crawl Status:"
sqlite3 grqaser.db "SELECT crawl_status, COUNT(*) as count FROM books GROUP BY crawl_status;"

echo -e "\n📅 Data Range:"
sqlite3 grqaser.db "SELECT MIN(created_at) as earliest, MAX(created_at) as latest FROM books;"
