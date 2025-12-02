# Database Setup Guide

## Quick Start

### Option 1: Using the Setup Script (Recommended)

```bash
cd server
./setup-database.sh
```

This script will:
- Check if PostgreSQL is installed
- Create the database
- Set up your `.env` file

### Option 2: Manual Setup

#### 1. Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Or download from:** https://www.postgresql.org/download/

#### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE minihelpdesk;

# Exit psql
\q
```

#### 3. Create .env File

Create a `.env` file in the `server` directory:

```bash
cd server
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/minihelpdesk
PORT=5000
JWT_SECRET=minihelpdesk-secret-key-change-in-production
EOF
```

**Replace:**
- `your_password` with your PostgreSQL password
- `postgres` with your PostgreSQL username if different
- `minihelpdesk` with your database name if different

#### 4. Start the Server

```bash
# Kill any process on port 5000 (if needed)
lsof -ti:5000 | xargs kill -9

# Start the server
npm start
```

Or use the startup script:
```bash
./start-server.sh
```

## Using Cloud Database (Neon, Render, etc.)

If you're using a cloud PostgreSQL service:

1. Get your connection string from your provider
2. Update `.env` file:

```bash
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
PORT=5000
JWT_SECRET=your-secret-key
```

## Troubleshooting

### Port 5000 Already in Use

```bash
# Find and kill the process
lsof -ti:5000 | xargs kill -9

# Or use the startup script
./start-server.sh
```

### Database Connection Error

1. Check if PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Verify your connection string in `.env`:
   ```bash
   cat .env
   ```

3. Test connection manually:
   ```bash
   psql $DATABASE_URL
   ```

### Tables Not Created

The tables are created automatically on first server start. If they're not created:

1. Check server logs for errors
2. Verify database connection string
3. Ensure database exists and user has proper permissions

## Database Schema

The application will automatically create the following tables:
- `users` - User accounts
- `workspaces` - Workspace containers
- `spaces` - Spaces within workspaces
- `folders` - Folders within spaces
- `projects` - Project lists
- `tasks` - Task items
- `comments` - Task comments
- `integrations` - Integration configurations
- `automations` - Automation rules
- And more...

All tables are created automatically when the server starts.

