#!/bin/bash

echo "🚀 Starting MiniHelpDesk with Render.com Database"
echo "=================================================="
echo ""

# Check if .env exists
if [ ! -f server/.env ]; then
    echo "❌ .env file not found in server directory!"
    exit 1
fi

# Verify DATABASE_URL
if ! grep -q "DATABASE_URL" server/.env; then
    echo "❌ DATABASE_URL not found in .env file!"
    exit 1
fi

echo "✅ Database configuration found"
echo ""

# Kill existing processes
echo "1️⃣  Stopping existing processes..."
pkill -f "react-scripts" 2>/dev/null
lsof -ti:5000 | xargs kill -9 2>/dev/null
sleep 2
echo "   ✅ Processes stopped"
echo ""

# Test database connection
echo "2️⃣  Testing database connection..."
cd server
if node test-database-connection.js 2>/dev/null; then
    echo "   ✅ Database connection successful"
else
    echo "   ⚠️  Database connection test failed, but continuing..."
fi
echo ""

# Start server
echo "3️⃣  Starting server on port 5000..."
echo "   📊 Database: Render.com PostgreSQL"
echo "   🌐 Server: http://localhost:5000"
echo ""
echo "   The server will:"
echo "   - Connect to your Render.com database"
echo "   - Create all tables automatically (if needed)"
echo "   - Store all workspace and task data in the database"
echo ""
echo "   Press Ctrl+C to stop the server"
echo ""
echo "=========================================="
echo ""

npm start
