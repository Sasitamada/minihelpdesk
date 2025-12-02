#!/bin/bash

echo "🔧 Simple Fix for MiniHelpDesk"
echo "=============================="
echo ""

# Step 1: Stop client
echo "Step 1: Stopping client..."
pkill -f "react-scripts" 2>/dev/null
sleep 2
echo "✅ Client stopped"
echo ""

# Step 2: Clear cache
echo "Step 2: Clearing cache..."
cd client
rm -rf node_modules/.cache .cache build 2>/dev/null
echo "✅ Cache cleared"
echo ""

# Step 3: Verify server is running
echo "Step 3: Checking server..."
if curl -s http://localhost:5001/api/workspaces > /dev/null 2>&1; then
    echo "✅ Server is running on port 5001"
else
    echo "❌ Server is NOT running!"
    echo ""
    echo "Please start the server first:"
    echo "  cd server"
    echo "  npm start"
    exit 1
fi
echo ""

# Step 4: Verify configuration
echo "Step 4: Verifying configuration..."
if grep -q "localhost:5001" src/services/api.js; then
    echo "✅ API configured correctly"
else
    echo "❌ Configuration error!"
    exit 1
fi
echo ""

echo "=============================="
echo "✅ Ready to start!"
echo ""
echo "Now run this command:"
echo "  npm start"
echo ""
echo "After it starts, open browser and press:"
echo "  Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo ""
