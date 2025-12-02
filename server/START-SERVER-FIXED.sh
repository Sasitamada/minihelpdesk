#!/bin/bash

echo "🚀 Starting MiniHelpDesk Server (Fixed)"
echo "========================================="
echo ""

# Aggressively kill port 5000
echo "1️⃣  Clearing port 5000..."
./KILL-PORT-5000.sh
sleep 3

# Verify .env
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Verify DATABASE_URL
if ! grep -q "DATABASE_URL" .env; then
    echo "❌ DATABASE_URL not found in .env!"
    exit 1
fi

echo ""
echo "2️⃣  Configuration:"
echo "   📊 Database: Render.com PostgreSQL"
echo "   🌐 Port: 5000"
echo "   🔗 CORS: Enabled for localhost:3000"
echo ""

# Test database
echo "3️⃣  Testing database connection..."
if node test-database-connection.js 2>/dev/null | grep -q "successful"; then
    echo "   ✅ Database connection verified"
else
    echo "   ⚠️  Database test failed, but continuing..."
fi
echo ""

# Check if port is still busy
if lsof -ti:5000 > /dev/null 2>&1; then
    echo "❌ Port 5000 is still in use!"
    echo ""
    echo "   This is likely macOS AirPlay Receiver."
    echo "   To fix:"
    echo "   1. Open System Settings"
    echo "   2. Go to General → AirDrop & Handoff"
    echo "   3. Turn OFF 'AirPlay Receiver'"
    echo "   4. Then run this script again"
    echo ""
    echo "   OR use port 5001 by changing PORT in .env"
    exit 1
fi

echo "4️⃣  Starting server..."
echo "   The server will:"
echo "   - Connect to Render.com database"
echo "   - Accept requests from localhost:3000"
echo "   - Listen on http://localhost:5000"
echo ""
echo "   Press Ctrl+C to stop"
echo ""
echo "========================================="
echo ""

npm start
