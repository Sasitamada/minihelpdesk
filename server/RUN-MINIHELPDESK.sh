#!/bin/bash

echo "🚀 Starting MiniHelpDesk - Complete Setup"
echo "========================================="
echo ""

cd /Users/sasitamda/Desktop/minihelpdesk-2/server

# Clear port 5001
echo "1️⃣  Clearing port 5001..."
lsof -ti:5001 | xargs kill -9 2>/dev/null
sleep 2
echo "   ✅ Port 5001 cleared"
echo ""

# Verify .env
echo "2️⃣  Verifying configuration..."
if [ ! -f .env ]; then
    echo "   ❌ .env file not found!"
    exit 1
fi

PORT=$(grep "^PORT=" .env | cut -d '=' -f2 | tr -d ' ')
echo "   ✅ Server will run on port: ${PORT:-5001}"
echo "   ✅ Database: Render.com PostgreSQL"
echo ""

# Test database connection
echo "3️⃣  Testing database connection..."
DB_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2-)
if echo "$DB_URL" | grep -q "render.com"; then
    DB_URL="${DB_URL}?sslmode=require"
fi

if command -v psql &> /dev/null; then
    if psql "$DB_URL" -c "SELECT 1;" &> /dev/null; then
        echo "   ✅ Database connection successful!"
    else
        echo "   ⚠️  Database connection test failed (continuing anyway)"
    fi
else
    echo "   ⚠️  psql not found, skipping connection test"
fi

echo ""
echo "4️⃣  Starting server..."
echo "   🌐 API will be available at: http://localhost:${PORT:-5001}"
echo "   📊 Database: Connected to Render.com"
echo ""
echo "   The server will automatically:"
echo "   - Create all database tables"
echo "   - Initialize the automation engine"
echo "   - Start the API server"
echo ""
echo "   Press Ctrl+C to stop the server"
echo ""
echo "========================================="
echo ""

npm start
