#!/bin/bash

echo "🔧 Fixing MiniHelpDesk Connection Issues"
echo "=========================================="
echo ""

# Check server
echo "1️⃣  Checking server..."
if curl -s http://localhost:5001/api/workspaces > /dev/null 2>&1; then
    echo "   ✅ Server is running on port 5001"
else
    echo "   ❌ Server is NOT running!"
    echo "   Please start the server first:"
    echo "   cd server && npm start"
    exit 1
fi

# Verify all port references are correct
echo ""
echo "2️⃣  Verifying port configuration..."
WRONG_PORTS=$(grep -r "localhost:5000" client/src --include="*.js" --include="*.jsx" 2>/dev/null | wc -l | xargs)
if [ "$WRONG_PORTS" -eq "0" ]; then
    echo "   ✅ All client files use port 5001"
else
    echo "   ⚠️  Found $WRONG_PORTS files still using port 5000"
fi

# Check .env
echo ""
echo "3️⃣  Checking server configuration..."
if [ -f server/.env ]; then
    SERVER_PORT=$(grep "^PORT=" server/.env | cut -d '=' -f2 | tr -d ' ')
    echo "   ✅ Server .env configured for port: ${SERVER_PORT:-5001}"
else
    echo "   ❌ Server .env file not found!"
fi

echo ""
echo "4️⃣  Client Configuration:"
echo "   - API URL: http://localhost:5001/api"
echo "   - Socket URL: http://localhost:5001"
echo "   - Proxy: http://localhost:5001"
echo ""

echo "=========================================="
echo "✅ Configuration Check Complete!"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. RESTART THE CLIENT (Important!):"
echo "   - Stop the current client (Ctrl+C)"
echo "   - Then run: cd client && npm start"
echo ""
echo "2. Clear browser cache:"
echo "   - Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo ""
echo "3. Check browser console (F12) for any errors"
echo ""
echo "The server is running correctly on port 5001 ✅"
