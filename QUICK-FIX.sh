#!/bin/bash

echo "🔧 Quick Fix for Port 3002 Client"
echo "================================="
echo ""

echo "1️⃣  Checking for any remaining port 5000 references..."
FOUND=$(grep -r "localhost:5000" client/src --include="*.js" --include="*.jsx" 2>/dev/null | wc -l | xargs)
if [ "$FOUND" -gt "0" ]; then
    echo "   ⚠️  Found $FOUND references to port 5000"
    echo "   Fixing them..."
    find client/src -type f \( -name "*.js" -o -name "*.jsx" \) -exec sed -i '' 's/localhost:5000/localhost:5001/g' {} \;
    echo "   ✅ Fixed!"
else
    echo "   ✅ No port 5000 references found"
fi

echo ""
echo "2️⃣  Verifying server CORS includes port 3002..."
if grep -q "localhost:3002" server/server.js; then
    echo "   ✅ Server CORS includes port 3002"
else
    echo "   ❌ Server CORS missing port 3002"
fi

echo ""
echo "3️⃣  Testing server API..."
if curl -s http://localhost:5001/api/workspaces > /dev/null 2>&1; then
    echo "   ✅ Server is responding on port 5001"
else
    echo "   ❌ Server not responding!"
fi

echo ""
echo "================================="
echo "✅ Fixes Applied!"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Stop the client (Ctrl+C)"
echo ""
echo "2. Clear cache and restart:"
echo "   cd client"
echo "   rm -rf node_modules/.cache"
echo "   npm start"
echo ""
echo "3. In browser:"
echo "   - Open DevTools (F12)"
echo "   - Application → Clear Storage → Clear site data"
echo "   - Hard refresh: Cmd+Shift+R"
echo ""
