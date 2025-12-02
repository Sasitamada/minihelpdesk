#!/bin/bash

# Script to start the MiniHelpDesk server
# This will kill any process on port 5000 and start the server

echo "🔍 Checking for processes on port 5000..."

# Find and kill ALL processes on port 5000 (macOS/Linux)
PIDS=$(lsof -ti:5000 2>/dev/null)

if [ ! -z "$PIDS" ]; then
    echo "⚠️  Found processes using port 5000: $PIDS"
    for PID in $PIDS; do
        echo "   Stopping process $PID..."
        kill -9 $PID 2>/dev/null
    done
    sleep 3
    echo "✅ Processes stopped"
    
    # Double check
    REMAINING=$(lsof -ti:5000 2>/dev/null)
    if [ ! -z "$REMAINING" ]; then
        echo "⚠️  Warning: Some processes may still be using port 5000"
        echo "   You may need to disable AirPlay Receiver in System Settings"
        echo "   Or use a different port by setting PORT in .env"
    fi
else
    echo "✅ Port 5000 is available"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo ""
    echo "📝 Creating .env file from template..."
    cat > .env << 'EOF'
# Database Configuration
# Update this with your PostgreSQL connection string
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/minihelpdesk

# Server Port
PORT=5000

# JWT Secret
JWT_SECRET=minihelpdesk-secret-key-change-in-production
EOF
    echo "✅ .env file created. Please update DATABASE_URL with your database credentials."
    echo ""
fi

echo ""
echo "🚀 Starting server..."
echo ""

npm start

