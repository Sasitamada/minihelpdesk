#!/bin/bash

echo "🔧 Fixing and Starting MiniHelpDesk"
echo "===================================="
echo ""

# Step 1: Kill all processes
echo "1️⃣  Stopping all existing processes..."
pkill -f "react-scripts" 2>/dev/null
pkill -f "node.*server.js" 2>/dev/null
lsof -ti:5000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 3
echo "   ✅ All processes stopped"
echo ""

# Step 2: Verify .env file
echo "2️⃣  Verifying configuration..."
cd /Users/sasitamda/Desktop/minihelpdesk-2/server
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
echo ""

# Step 3: Test database connection
echo "3️⃣  Testing database connection..."
if node test-database-connection.js 2>/dev/null; then
    echo "   ✅ Database connection successful"
else
    echo "   ⚠️  Database connection test failed, but continuing..."
fi
echo ""

# Step 4: Clear client cache
echo "4️⃣  Clearing client cache..."
cd /Users/sasitamda/Desktop/minihelpdesk-2/client
rm -rf node_modules/.cache .cache build .eslintcache 2>/dev/null
echo "   ✅ Client cache cleared"
echo ""

echo "===================================="
echo "✅ Setup Complete!"
echo ""
echo "Now run these commands in separate terminals:"
echo ""
echo "TERMINAL 1 - Start Server:"
echo "  cd /Users/sasitamda/Desktop/minihelpdesk-2/server"
echo "  npm start"
echo ""
echo "TERMINAL 2 - Start Client:"
echo "  cd /Users/sasitamda/Desktop/minihelpdesk-2/client"
echo "  npm start"
echo ""
echo "Then open: http://localhost:3000"
echo ""
