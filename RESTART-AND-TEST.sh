#!/bin/bash

echo "🔄 Restarting MiniHelpDesk with Enhanced Dashboard"
echo "=================================================="
echo ""

# Kill existing processes
echo "1. Stopping existing processes..."
pkill -f "react-scripts" 2>/dev/null
pkill -f "node.*server.js" 2>/dev/null
sleep 2

# Clear client cache
echo "2. Clearing client cache..."
cd client
rm -rf node_modules/.cache .cache build .eslintcache 2>/dev/null
echo "   ✅ Cache cleared"

# Verify server is running
echo ""
echo "3. Checking server status..."
cd ../server
if ! curl -s http://localhost:5001/api/workspaces > /dev/null 2>&1; then
    echo "   ⚠️  Server not running. Starting server..."
    lsof -ti:5001 | xargs kill -9 2>/dev/null
    npm start > /tmp/minihelpdesk-server.log 2>&1 &
    sleep 3
    echo "   ✅ Server started (check /tmp/minihelpdesk-server.log for logs)"
else
    echo "   ✅ Server is running on port 5001"
fi

echo ""
echo "=================================================="
echo "✅ Setup complete!"
echo ""
echo "Now start the client:"
echo "  cd client && npm start"
echo ""
echo "Then open: http://localhost:3000/dashboard"
echo ""
echo "Features available:"
echo "  ✅ Custom widgets (drag & drop)"
echo "  ✅ Burndown charts"
echo "  ✅ Task by assignee"
echo "  ✅ Sprint metrics"
echo "  ✅ Custom KPIs"
echo "  ✅ Multiple widgets layout"
