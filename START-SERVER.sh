#!/bin/bash

echo "🚀 Starting MiniHelpDesk Server"
echo "================================"
echo ""

cd /Users/sasitamda/Desktop/minihelpdesk-2/server

# Kill process on port 5000
echo "1️⃣  Clearing port 5000..."
lsof -ti:5000 | xargs kill -9 2>/dev/null
sleep 2
echo "   ✅ Port cleared"
echo ""

# Verify .env
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

echo "2️⃣  Configuration:"
echo "   📊 Database: Render.com PostgreSQL"
echo "   🌐 Port: 5000"
echo ""

echo "3️⃣  Starting server..."
echo "   The server will:"
echo "   - Connect to Render.com database"
echo "   - Create tables automatically"
echo "   - Listen on http://localhost:5000"
echo ""
echo "   Press Ctrl+C to stop"
echo ""
echo "================================"
echo ""

npm start
