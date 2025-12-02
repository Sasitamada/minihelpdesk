#!/bin/bash

echo "🧹 Force Clearing ALL Caches"
echo "============================="
echo ""

cd /Users/sasitamda/Desktop/minihelpdesk-2/client

# Stop client
echo "1. Stopping client..."
pkill -f "react-scripts" 2>/dev/null
sleep 3

# Clear ALL caches
echo "2. Clearing ALL caches..."
rm -rf node_modules/.cache
rm -rf .cache
rm -rf build
rm -rf .eslintcache
rm -rf .parcel-cache
find . -name "*.cache" -type d -exec rm -rf {} + 2>/dev/null
find . -name ".DS_Store" -delete 2>/dev/null
echo "   ✅ All caches cleared"
echo ""

# Verify configuration
echo "3. Current configuration:"
echo "   API URL: $(grep 'API_URL' src/services/api.js | grep -o 'localhost:[0-9]*')"
echo "   Socket: $(grep 'localhost' src/hooks/useSocket.js | grep -o 'localhost:[0-9]*')"
echo "   Proxy: $(grep 'proxy' package.json | grep -o 'localhost:[0-9]*')"
echo ""

# Check for any remaining 5000 references
if grep -r "localhost:5000" src/ 2>/dev/null | grep -v ".bak" | grep -v "node_modules"; then
    echo "   ⚠️  Found references to port 5000!"
    echo "   Files with 5000:"
    grep -r "localhost:5000" src/ 2>/dev/null | grep -v ".bak" | cut -d: -f1 | sort -u
else
    echo "   ✅ No references to port 5000 found"
fi
echo ""

echo "============================="
echo "✅ Ready! Now run: npm start"
echo ""
echo "IMPORTANT: After it starts, in browser:"
echo "  1. Close ALL browser tabs"
echo "  2. Close browser completely"
echo "  3. Reopen browser"
echo "  4. Open NEW tab"
echo "  5. Go to: http://localhost:3000"
echo "  6. Press: Cmd+Shift+R (hard refresh)"
echo ""
echo "OR use Incognito/Private window (bypasses all cache)"
