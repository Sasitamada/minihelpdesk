# Quick Start Guide

## Option 1: Use the Automated Script (Recommended)

```bash
cd server
./fix-and-start.sh
```

This script will:
- Kill processes on port 5000
- Check/update .env file with your password
- Test database connection
- Start the server (or use port 5001 if 5000 is busy)

## Option 2: Manual Setup

### Step 1: Update .env file with your PostgreSQL password

```bash
cd server
nano .env
```

Replace `YOUR_PASSWORD` with your actual PostgreSQL password.

Or use this command (replace YOUR_PASSWORD):
```bash
sed -i '' 's/YOUR_PASSWORD/your_actual_password/g' .env
```

### Step 2: Kill processes on port 5000

```bash
# Kill all processes
lsof -ti:5000 | xargs kill -9

# Or disable AirPlay Receiver (macOS):
# System Settings > General > AirDrop & Handoff > AirPlay Receiver: Off
```

### Step 3: Start the server

```bash
npm start
```

## Option 3: Use Different Port

If port 5000 is always busy (AirPlay), use port 5001:

```bash
# Update .env
sed -i '' 's/PORT=5000/PORT=5001/' .env

# Start server
npm start
```

Then update your client to use `http://localhost:5001` instead of `http://localhost:5000`
