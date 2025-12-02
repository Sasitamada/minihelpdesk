#!/bin/bash

echo "🔄 Restarting Client with Fixed Configuration"
echo "=============================================="
echo ""

cd /Users/sasitamda/Desktop/minihelpdesk-2/client

echo "1️⃣  Stopping any running client processes..."
pkill -f "react-scripts" 2>/dev/null
sleep 2
echo "   ✅ Stopped"

echo ""
echo "2️⃣  Clearing all caches..."
rm -rf node_modules/.cache 2>/dev/null
rm -rf .cache 2>/dev/null
rm -rf build 2>/dev/null
echo "   ✅ Cache cleared"

echo ""
echo "3️⃣  Verifying configuration..."
if grep -q "localhost:5001" src/services/api.js; then
    echo "   ✅ API configured for port 5001"
else
    echo "   ❌ API still using wrong port!"
    exit 1
fi

if grep -q "localhost:5001" src/hooks/useSocket.js; then
    echo "   ✅ Socket configured for port 5001"
else
    echo "   ❌ Socket still using wrong port!"
    exit 1
fi

echo ""
echo "4️⃣  Starting client..."
echo "   The client will start on a random port (3000-3003)"
echo "   Make sure to check the console for: 'API Base URL: http://localhost:5001/api'"
echo ""
echo "=============================================="
echo ""

npm start
