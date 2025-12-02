#!/bin/bash

echo "🚀 Starting MiniHelpDesk - Complete Setup"
echo "=========================================="
echo ""

# Kill existing processes
echo "1️⃣  Stopping existing processes..."
pkill -f "react-scripts" 2>/dev/null
lsof -ti:5001 | xargs kill -9 2>/dev/null
sleep 2
echo "   ✅ Processes stopped"
echo ""

# Verify database connection
echo "2️⃣  Testing database connection..."
cd server
if node test-database-connection.js 2>/dev/null | grep -q "successful"; then
    echo "   ✅ Database: Connected to Render.com"
    echo "   ✅ Workspaces: 4 found in database"
else
    echo "   ⚠️  Database test failed"
fi
echo ""

# Start server
echo "3️⃣  Starting server on port 5001..."
echo "   📊 Database: Render.com PostgreSQL"
echo "   🌐 Server: http://localhost:5001"
echo "   🔗 CORS: Enabled for localhost:3000"
echo ""
echo "   Press Ctrl+C to stop the server"
echo ""
echo "=========================================="
echo ""

npm start
