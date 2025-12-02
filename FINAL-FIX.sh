#!/bin/bash

echo "🔧 FINAL FIX - Making Sure Everything Works"
echo "==========================================="
echo ""

# Step 1: Stop everything
echo "1. Stopping client and server processes..."
pkill -f "react-scripts" 2>/dev/null
pkill -f "node server.js" 2>/dev/null
sleep 2
echo "   ✅ Stopped"
echo ""

# Step 2: Clear ALL caches
echo "2. Clearing ALL caches..."
cd /Users/sasitamda/Desktop/minihelpdesk-2/client
rm -rf node_modules/.cache 2>/dev/null
rm -rf .cache 2>/dev/null
rm -rf build 2>/dev/null
rm -rf .eslintcache 2>/dev/null
echo "   ✅ Cache cleared"
echo ""

# Step 3: Double-check all files use port 5001
echo "3. Verifying all files use port 5001..."
cd /Users/sasitamda/Desktop/minihelpdesk-2
find client/src -type f \( -name "*.js" -o -name "*.jsx" \) -exec grep -l "localhost:5000" {} \; 2>/dev/null | while read file; do
    echo "   Fixing: $file"
    sed -i '' 's/localhost:5000/localhost:5001/g' "$file"
done
echo "   ✅ All files verified"
echo ""

# Step 4: Verify server .env
echo "4. Verifying server configuration..."
cd /Users/sasitamda/Desktop/minihelpdesk-2/server
if grep -q "PORT=5001" .env 2>/dev/null; then
    echo "   ✅ Server configured for port 5001"
else
    echo "   ⚠️  Updating server .env..."
    if grep -q "^PORT=" .env 2>/dev/null; then
        sed -i '' 's/^PORT=.*/PORT=5001/' .env
    else
        echo "PORT=5001" >> .env
    fi
    echo "   ✅ Server .env updated"
fi
echo ""

# Step 5: Clear port 5001 and start server
echo "5. Starting server..."
lsof -ti:5001 | xargs kill -9 2>/dev/null
sleep 2
cd /Users/sasitamda/Desktop/minihelpdesk-2/server
npm start &
SERVER_PID=$!
sleep 3

# Test server
if curl -s http://localhost:5001/api/workspaces > /dev/null 2>&1; then
    echo "   ✅ Server started successfully on port 5001"
else
    echo "   ⚠️  Server might need manual start"
fi
echo ""

echo "==========================================="
echo "✅ Fix Complete!"
echo ""
echo "Now start the client:"
echo "  cd /Users/sasitamda/Desktop/minihelpdesk-2/client"
echo "  npm start"
echo ""
echo "Then in browser:"
echo "  1. Close ALL tabs with localhost"
echo "  2. Open NEW tab"
echo "  3. Go to: http://localhost:3000"
echo "  4. Press: Cmd+Shift+R (hard refresh)"
echo ""
