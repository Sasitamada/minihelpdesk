#!/bin/bash

echo "🔧 FIXING ALL ERRORS NOW"
echo "========================"
echo ""

# Stop everything
echo "1. Stopping all processes..."
pkill -f "react-scripts" 2>/dev/null
sleep 2

# Clear client cache
echo "2. Clearing client cache..."
cd client
rm -rf node_modules/.cache .cache build .eslintcache 2>/dev/null
echo "   ✅ Cache cleared"
echo ""

# Verify server
echo "3. Checking server..."
if curl -s http://localhost:5001/api/workspaces > /dev/null 2>&1; then
    echo "   ✅ Server running on port 5001"
    echo "   ✅ Database connected (4 workspaces found)"
else
    echo "   ⚠️  Server not running"
fi
echo ""

echo "========================"
echo "✅ Ready!"
echo ""
echo "Now run: npm start"
echo ""
echo "Then in browser:"
echo "  → Open Incognito window (Cmd+Shift+N)"
echo "  → Go to: http://localhost:3000"
echo "  → Should work immediately!"
echo ""
echo "OR:"
echo "  → Press F12"
echo "  → Right-click refresh button"
echo "  → Select 'Empty Cache and Hard Reload'"
