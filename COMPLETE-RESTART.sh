#!/bin/bash

echo "🔄 COMPLETE RESTART - Fixing All Issues"
echo "========================================"
echo ""

# Step 1: Kill all processes
echo "1️⃣  Stopping all processes..."
pkill -f "react-scripts" 2>/dev/null
pkill -f "node.*server.js" 2>/dev/null
sleep 3
echo "   ✅ All processes stopped"
echo ""

# Step 2: Clear ALL client caches
echo "2️⃣  Clearing ALL client caches..."
cd /Users/sasitamda/Desktop/minihelpdesk-2/client
rm -rf node_modules/.cache
rm -rf .cache
rm -rf build
rm -rf .eslintcache
rm -rf .parcel-cache
find . -name "*.cache" -type d -exec rm -rf {} + 2>/dev/null
find . -name ".DS_Store" -delete 2>/dev/null
echo "   ✅ All caches cleared"
echo ""

# Step 3: Verify configuration
echo "3️⃣  Verifying configuration..."
echo "   API URL: $(grep 'API_URL' src/services/api.js | grep -o 'localhost:[0-9]*')"
echo "   Socket: $(grep 'localhost' src/hooks/useSocket.js | grep -o 'localhost:[0-9]*')"
echo "   Proxy: $(grep 'proxy' package.json | grep -o 'localhost:[0-9]*')"
echo ""

# Step 4: Check server
echo "4️⃣  Checking server..."
cd /Users/sasitamda/Desktop/minihelpdesk-2/server
if curl -s http://localhost:5001/api/workspaces > /dev/null 2>&1; then
    echo "   ✅ Server is running on port 5001"
else
    echo "   ⚠️  Server not running. Starting server..."
    lsof -ti:5001 | xargs kill -9 2>/dev/null
    npm start > /tmp/minihelpdesk-server.log 2>&1 &
    sleep 5
    echo "   ✅ Server started (check /tmp/minihelpdesk-server.log)"
fi
echo ""

echo "========================================"
echo "✅ Setup Complete!"
echo ""
echo "Now start the client:"
echo "  cd /Users/sasitamda/Desktop/minihelpdesk-2/client"
echo "  npm start"
echo ""
echo "Then in browser:"
echo "  1. Close ALL tabs"
echo "  2. Close browser completely"
echo "  3. Reopen browser"
echo "  4. Open Incognito/Private window"
echo "  5. Go to: http://localhost:3000"
echo ""
echo "OR:"
echo "  1. Open http://localhost:3000"
echo "  2. Press F12 (open console)"
echo "  3. Right-click refresh button"
echo "  4. Select 'Empty Cache and Hard Reload'"
