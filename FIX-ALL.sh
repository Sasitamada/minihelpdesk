#!/bin/bash

echo "🔧 Fixing MiniHelpDesk - One Command Fix"
echo "========================================="
echo ""

# Kill client
echo "1. Stopping client..."
pkill -f "react-scripts" 2>/dev/null
sleep 2

# Clear cache
echo "2. Clearing cache..."
cd /Users/sasitamda/Desktop/minihelpdesk-2/client
rm -rf node_modules/.cache .cache build 2>/dev/null

# Check server
echo "3. Checking server..."
if ! curl -s http://localhost:5001/api/workspaces > /dev/null 2>&1; then
    echo "   ⚠️  Server not running! Starting server..."
    echo "   Please run this in another terminal:"
    echo "   cd /Users/sasitamda/Desktop/minihelpdesk-2/server && npm start"
    echo ""
fi

# Verify config
echo "4. Verifying configuration..."
if grep -q "localhost:5001" src/services/api.js && grep -q "localhost:5001" src/hooks/useSocket.js; then
    echo "   ✅ All configuration correct"
else
    echo "   ❌ Configuration error - fixing..."
    find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec sed -i '' 's/localhost:5000/localhost:5001/g' {} \;
    echo "   ✅ Fixed"
fi

echo ""
echo "========================================="
echo "✅ Fix Complete!"
echo ""
echo "Now start the client:"
echo "  npm start"
echo ""
echo "Then in browser:"
echo "  1. Close all localhost tabs"
echo "  2. Open new tab"
echo "  3. Go to the URL shown (usually localhost:3000)"
echo "  4. Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo ""
