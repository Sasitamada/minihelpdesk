#!/bin/bash

echo "🔧 FORCE FIX - Clearing ALL Caches"
echo "===================================="
echo ""

cd /Users/sasitamda/Desktop/minihelpdesk-2/client

# Step 1: Kill client process
echo "1. Stopping client..."
pkill -f "react-scripts" 2>/dev/null
pkill -f "webpack" 2>/dev/null
sleep 3

# Step 2: Clear ALL caches
echo "2. Clearing ALL caches..."
rm -rf node_modules/.cache
rm -rf .cache
rm -rf build
rm -rf .eslintcache
rm -rf .parcel-cache
find . -name "*.cache" -type d -exec rm -rf {} + 2>/dev/null
echo "   ✅ All caches cleared"

# Step 3: Verify configuration
echo ""
echo "3. Current configuration:"
echo "   API URL: $(grep 'API_URL' src/services/api.js | grep -o 'localhost:[0-9]*')"
echo "   Socket: $(grep 'localhost' src/hooks/useSocket.js | grep -o 'localhost:[0-9]*')"
echo "   Proxy: $(grep 'proxy' package.json | grep -o 'localhost:[0-9]*')"
echo ""

echo "===================================="
echo "✅ Ready to restart!"
echo ""
echo "Now run: npm start"
echo ""
echo "After it starts, in browser:"
echo "  1. Close ALL browser tabs"
echo "  2. Close browser completely"
echo "  3. Reopen browser"
echo "  4. Open NEW tab"
echo "  5. Go to: http://localhost:3000"
echo "  6. Press: Cmd+Shift+R (hard refresh)"
echo ""
echo "OR use Incognito/Private window (bypasses all cache)"
