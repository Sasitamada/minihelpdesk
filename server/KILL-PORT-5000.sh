#!/bin/bash

echo "🔧 Aggressively Clearing Port 5000"
echo "==================================="
echo ""

# Method 1: Kill by port
echo "1. Killing processes on port 5000..."
lsof -ti:5000 | xargs kill -9 2>/dev/null
sleep 2

# Method 2: Kill all node processes (be careful!)
echo "2. Killing all node processes..."
pkill -9 node 2>/dev/null
sleep 2

# Method 3: Try again
echo "3. Final cleanup..."
lsof -ti:5000 | xargs kill -9 2>/dev/null
sleep 2

# Check if port is free
if lsof -ti:5000 > /dev/null 2>&1; then
    echo "⚠️  Port 5000 is still in use!"
    echo "   This might be macOS AirPlay Receiver"
    echo "   To disable it:"
    echo "   System Settings → General → AirDrop & Handoff → AirPlay Receiver → Off"
    echo ""
    echo "   OR use a different port by changing PORT in .env"
    exit 1
else
    echo "✅ Port 5000 is now free!"
    exit 0
fi
