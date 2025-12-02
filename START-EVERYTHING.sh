#!/bin/bash

echo "🚀 Starting MiniHelpDesk - Complete"
echo "===================================="
echo ""

# Kill existing
pkill -f "react-scripts" 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5001 | xargs kill -9 2>/dev/null
sleep 2

# Start server in background
echo "1️⃣  Starting server..."
cd /Users/sasitamda/Desktop/minihelpdesk-2/server
npm start > /tmp/minihelpdesk-server.log 2>&1 &
SERVER_PID=$!
sleep 5

# Check if server started
if curl -s http://localhost:5001/api/workspaces > /dev/null 2>&1; then
    echo "   ✅ Server running on port 5001"
else
    echo "   ⚠️  Server may not have started (check /tmp/minihelpdesk-server.log)"
fi
echo ""

# Start client
echo "2️⃣  Starting client..."
cd /Users/sasitamda/Desktop/minihelpdesk-2/client
rm -rf node_modules/.cache .cache build .eslintcache 2>/dev/null
echo "   ✅ Cache cleared"
echo ""
echo "   Client will start on http://localhost:3000"
echo "   Server is running on http://localhost:5001"
echo ""
echo "   Press Ctrl+C to stop"
echo ""
echo "===================================="
echo ""

npm start
