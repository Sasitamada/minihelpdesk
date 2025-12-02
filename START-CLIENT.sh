#!/bin/bash

echo "🚀 Starting MiniHelpDesk Client"
echo "================================"
echo ""

cd /Users/sasitamda/Desktop/minihelpdesk-2/client

# Clear cache
echo "1️⃣  Clearing cache..."
rm -rf node_modules/.cache .cache build .eslintcache 2>/dev/null
echo "   ✅ Cache cleared"
echo ""

echo "2️⃣  Starting client..."
echo "   🌐 Client: http://localhost:3000"
echo "   🔗 API: http://localhost:5000"
echo ""
echo "   Press Ctrl+C to stop"
echo ""
echo "================================"
echo ""

npm start
