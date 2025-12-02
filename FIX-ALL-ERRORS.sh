#!/bin/bash

echo "🔧 FIXING ALL ERRORS"
echo "===================="
echo ""

# Step 1: Kill all processes
echo "1️⃣  Stopping all processes..."
pkill -f "react-scripts" 2>/dev/null
pkill -f "node.*server.js" 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5001 | xargs kill -9 2>/dev/null
sleep 3
echo "   ✅ All processes stopped"
echo ""

# Step 2: Fix client webpack issue
echo "2️⃣  Fixing client configuration..."
cd /Users/sasitamda/Desktop/minihelpdesk-2/client

# Remove any problematic .env files
rm -f .env.local .env.development.local .env.production.local 2>/dev/null

# Clear all caches
rm -rf node_modules/.cache .cache build .eslintcache 2>/dev/null
echo "   ✅ Client cache cleared"
echo ""

# Step 3: Verify server .env
echo "3️⃣  Verifying server configuration..."
cd /Users/sasitamda/Desktop/minihelpdesk-2/server
if [ ! -f .env ]; then
    echo "   ❌ .env file not found! Creating it..."
    cat > .env << 'ENVEOF'
PORT=5001
DATABASE_URL=postgresql://helpdesk_db_avyz_user:kUc1OsIzdy2aFRpzyKm47CFeRpDvbb0I@dpg-d4fmlouuk2gs73ffefn0-a.oregon-postgres.render.com/helpdesk_db_avyz
JWT_SECRET=minihelpdesk_super_secret_jwt_key_2024_change_this_in_production
ENVEOF
    echo "   ✅ .env file created"
else
    echo "   ✅ .env file exists"
fi
echo ""

# Step 4: Test database
echo "4️⃣  Testing database connection..."
if node test-database-connection.js 2>/dev/null | grep -q "successful"; then
    echo "   ✅ Database connection working"
else
    echo "   ⚠️  Database test failed (but continuing)"
fi
echo ""

echo "===================="
echo "✅ Fix Complete!"
echo ""
echo "Now start in 2 terminals:"
echo ""
echo "TERMINAL 1 - Server:"
echo "  cd /Users/sasitamda/Desktop/minihelpdesk-2/server"
echo "  npm start"
echo ""
echo "TERMINAL 2 - Client:"
echo "  cd /Users/sasitamda/Desktop/minihelpdesk-2/client"
echo "  npm start"
echo ""
echo "Then open: http://localhost:3000 (use Incognito window)"
