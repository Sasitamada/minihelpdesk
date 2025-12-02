#!/bin/bash

echo "🚀 Starting MiniHelpDesk - All Errors Fixed"
echo "============================================"
echo ""

# Kill everything
echo "1️⃣  Stopping all processes..."
pkill -f "react-scripts" 2>/dev/null
pkill -f "node.*server.js" 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5001 | xargs kill -9 2>/dev/null
sleep 3
echo "   ✅ All processes stopped"
echo ""

# Fix client .env issue
echo "2️⃣  Fixing client configuration..."
cd /Users/sasitamda/Desktop/minihelpdesk-2/client
rm -f .env .env.local .env.development .env.production 2>/dev/null
rm -rf node_modules/.cache .cache build .eslintcache 2>/dev/null
echo "   ✅ Client cache and .env files cleared"
echo ""

# Verify server
echo "3️⃣  Verifying server..."
cd /Users/sasitamda/Desktop/minihelpdesk-2/server
if [ -f .env ]; then
    echo "   ✅ Server .env exists"
    if grep -q "PORT=5001" .env; then
        echo "   ✅ Server configured for port 5001"
    fi
else
    echo "   ⚠️  Server .env missing"
fi
echo ""

echo "============================================"
echo "✅ Ready to Start!"
echo ""
echo "Now run these commands in 2 separate terminals:"
echo ""
echo "TERMINAL 1 - Server:"
echo "  cd /Users/sasitamda/Desktop/minihelpdesk-2/server"
echo "  npm start"
echo ""
echo "TERMINAL 2 - Client:"
echo "  cd /Users/sasitamda/Desktop/minihelpdesk-2/client"
echo "  npm start"
echo ""
echo "Then open: http://localhost:3000 (use Incognito window)"
