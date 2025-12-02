#!/bin/bash

echo "🔄 Restarting Client - Final Fix"
echo "================================="
echo ""

cd /Users/sasitamda/Desktop/minihelpdesk-2/client

# Kill client
echo "1. Stopping client..."
pkill -f "react-scripts" 2>/dev/null
sleep 2

# Clear cache
echo "2. Clearing cache..."
rm -rf node_modules/.cache .cache build .eslintcache 2>/dev/null
echo "   ✅ Cache cleared"

# Verify API URL
echo ""
echo "3. Current API configuration:"
grep "API_URL" src/services/api.js | head -1
echo ""

echo "================================="
echo "✅ Ready! Now run: npm start"
echo ""
echo "After it starts, in browser:"
echo "  - Close all localhost tabs"
echo "  - Open new tab"
echo "  - Go to http://localhost:3000"
echo "  - Press Cmd+Shift+R"
echo ""
