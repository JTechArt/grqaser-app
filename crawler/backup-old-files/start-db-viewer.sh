#!/bin/bash

# GRQASER Database Viewer Startup Script

echo "📚 GRQASER Database Viewer"
echo "=========================="

# Check if we're in the right directory
if [ ! -f "grqaser.db" ]; then
    echo "❌ Error: grqaser.db not found in current directory"
    echo "Please run this script from the crawler/data directory"
    exit 1
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    exit 1
fi

# Check if Flask is installed
if ! python3 -c "import flask" &> /dev/null; then
    echo "📦 Installing Flask dependencies..."
    pip3 install -r requirements.txt
fi

echo "🚀 Starting database viewer server..."
echo "📊 Open your browser and go to: http://localhost:5000"
echo "⏹️  Press Ctrl+C to stop the server"
echo ""

# Start the Flask server
python3 db-server.py
