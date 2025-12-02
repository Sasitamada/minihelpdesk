#!/bin/bash

echo "🚀 Starting MiniHelpDesk Server"
echo "================================"
echo ""

# Kill any process on port 5000
echo "1️⃣  Clearing port 5000..."
PIDS=$(lsof -ti:5000 2>/dev/null)
if [ ! -z "$PIDS" ]; then
    for PID in $PIDS; do
        echo "   Killing process $PID..."
        kill -9 $PID 2>/dev/null
    done
    sleep 2
    echo "   ✅ Port cleared"
else
    echo "   ✅ Port 5000 is available"
fi

# Verify .env file
echo ""
echo "2️⃣  Verifying configuration..."
if [ ! -f .env ]; then
    echo "   ❌ .env file not found!"
    exit 1
fi

if grep -q "DATABASE_URL" .env; then
    echo "   ✅ Database URL configured"
else
    echo "   ❌ DATABASE_URL not found in .env"
    exit 1
fi

echo ""
echo "3️⃣  Starting server..."
echo "   Database: Render.com PostgreSQL"
echo "   Port: 5000"
echo ""
echo "   The server will:"
echo "   - Connect to your Render.com database"
echo "   - Create all tables automatically"
echo "   - Start listening on http://localhost:5000"
echo ""
echo "   Press Ctrl+C to stop the server"
echo ""
echo "=========================================="
echo ""

npm start
