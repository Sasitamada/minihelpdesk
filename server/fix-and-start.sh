#!/bin/bash

echo "🔧 Fixing Port 5000 and Starting Server"
echo "========================================"
echo ""

# Kill all processes on port 5000
echo "1️⃣  Killing processes on port 5000..."
PIDS=$(lsof -ti:5000 2>/dev/null)
if [ ! -z "$PIDS" ]; then
    for PID in $PIDS; do
        echo "   Killing PID: $PID"
        kill -9 $PID 2>/dev/null
    done
    sleep 3
fi

# Check if .env exists and has correct format
echo ""
echo "2️⃣  Checking .env file..."
if [ ! -f .env ]; then
    echo "   ❌ .env file not found!"
    echo "   Creating .env file..."
    read -sp "Enter PostgreSQL password: " DB_PASSWORD
    echo ""
    cat > .env << ENVEOF
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@localhost:5432/minihelpdesk
PORT=5000
JWT_SECRET=minihelpdesk-secret-key-change-in-production
ENVEOF
    echo "   ✅ .env file created"
else
    # Check if DATABASE_URL has YOUR_PASSWORD placeholder
    if grep -q "YOUR_PASSWORD" .env 2>/dev/null; then
        echo "   ⚠️  .env file has placeholder password!"
        read -sp "Enter PostgreSQL password: " DB_PASSWORD
        echo ""
        sed -i '' "s/YOUR_PASSWORD/${DB_PASSWORD}/g" .env
        echo "   ✅ Password updated in .env"
    else
        echo "   ✅ .env file exists"
    fi
fi

# Test database connection
echo ""
echo "3️⃣  Testing database connection..."
if command -v psql &> /dev/null; then
    DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2-)
    if psql "$DB_URL" -c "SELECT 1;" &> /dev/null; then
        echo "   ✅ Database connection successful"
    else
        echo "   ⚠️  Database connection test failed"
        echo "   Please check your DATABASE_URL in .env file"
    fi
else
    echo "   ⚠️  psql not found, skipping connection test"
fi

# Final check for port 5000
echo ""
echo "4️⃣  Final port check..."
REMAINING=$(lsof -ti:5000 2>/dev/null)
if [ ! -z "$REMAINING" ]; then
    echo "   ⚠️  Port 5000 still in use!"
    echo "   Trying to use port 5001 instead..."
    sed -i '' 's/PORT=5000/PORT=5001/' .env
    echo "   ✅ Changed to port 5001 in .env"
else
    echo "   ✅ Port 5000 is available"
fi

echo ""
echo "🚀 Starting server..."
echo ""

npm start
