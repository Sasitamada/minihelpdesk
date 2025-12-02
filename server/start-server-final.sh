#!/bin/bash

echo "🚀 Starting MiniHelpDesk Server"
echo "================================"
echo ""

# Read port from .env
PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d '=' -f2 | tr -d ' ')
PORT=${PORT:-5001}

echo "📍 Using port: $PORT"
echo ""

# Kill any process on the port
echo "1️⃣  Clearing port $PORT..."
PIDS=$(lsof -ti:$PORT 2>/dev/null)
if [ ! -z "$PIDS" ]; then
    for PID in $PIDS; do
        echo "   Killing process $PID..."
        kill -9 $PID 2>/dev/null
    done
    sleep 2
    echo "   ✅ Port cleared"
else
    echo "   ✅ Port $PORT is available"
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
    DB_HOST=$(grep DATABASE_URL .env | cut -d '@' -f2 | cut -d '/' -f1)
    echo "   📊 Database: $DB_HOST"
else
    echo "   ❌ DATABASE_URL not found in .env"
    exit 1
fi

# Test database connection
echo ""
echo "3️⃣  Testing database connection..."
if command -v psql &> /dev/null; then
    DB_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2-)
    # Add sslmode if it's a render.com URL
    if echo "$DB_URL" | grep -q "render.com"; then
        DB_URL="${DB_URL}?sslmode=require"
    fi
    if psql "$DB_URL" -c "SELECT 1;" &> /dev/null; then
        echo "   ✅ Database connection successful"
    else
        echo "   ⚠️  Database connection test failed (but continuing anyway)"
    fi
else
    echo "   ⚠️  psql not found, skipping connection test"
fi

echo ""
echo "4️⃣  Starting server..."
echo "   🌐 Server will be available at: http://localhost:$PORT"
echo "   📊 Database: Render.com PostgreSQL"
echo ""
echo "   The server will:"
echo "   - Connect to your Render.com database"
echo "   - Create all tables automatically"
echo "   - Start listening on http://localhost:$PORT"
echo ""
echo "   Press Ctrl+C to stop the server"
echo ""
echo "=========================================="
echo ""

npm start
