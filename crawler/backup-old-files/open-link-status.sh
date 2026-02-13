#!/bin/bash

# Open GRQASER Link Status Viewer in browser

echo "🔗 Opening GRQASER Link Status Viewer..."
echo "🌐 Opening in your default browser..."

# Get the full path to the HTML file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HTML_FILE="$SCRIPT_DIR/link-status-viewer.html"

# Check if the file exists
if [ ! -f "$HTML_FILE" ]; then
    echo "❌ Error: HTML file not found. Please run 'python3 link-status-viewer.py' first."
    exit 1
fi

# Open in default browser
if command -v open &> /dev/null; then
    # macOS
    open "$HTML_FILE"
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open "$HTML_FILE"
elif command -v start &> /dev/null; then
    # Windows
    start "$HTML_FILE"
else
    echo "❌ Could not open browser automatically."
    echo "📁 Please open this file manually: $HTML_FILE"
fi

echo "✅ Link status viewer opened!"
