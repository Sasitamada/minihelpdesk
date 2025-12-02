# Quick Commands to Run

## 1. Kill Process on Port 5000
```bash
lsof -ti:5000 | xargs kill -9
```

## 2. Check if PostgreSQL is Installed
```bash
which psql
```

## 3. Install PostgreSQL (if not installed)
```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# Or check if it's already running
pg_isready
```

## 4. Create Database (if using local PostgreSQL)
```bash
# Connect to PostgreSQL
psql -U postgres

# Then run:
CREATE DATABASE minihelpdesk;
\q
```

## 5. Create .env File
```bash
cd server
cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/minihelpdesk
PORT=5000
JWT_SECRET=minihelpdesk-secret-key-change-in-production
ENVEOF
```

**IMPORTANT:** Update the DATABASE_URL with your actual PostgreSQL credentials!

## 6. Start Server (Easy Way)
```bash
cd server
./start-server.sh
```

## 7. Start Server (Manual Way)
```bash
cd server
npm start
```

## Alternative: Use Setup Script
```bash
cd server
./setup-database.sh
```
