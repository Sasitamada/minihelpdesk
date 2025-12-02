#!/bin/bash

# Database Setup Script for MiniHelpDesk
# This script helps set up PostgreSQL database for the application

echo "🚀 MiniHelpDesk Database Setup"
echo "================================"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed."
    echo ""
    echo "📦 Install PostgreSQL:"
    echo "   macOS: brew install postgresql@14"
    echo "   Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "   Or download from: https://www.postgresql.org/download/"
    exit 1
fi

echo "✅ PostgreSQL is installed"
echo ""

# Check if PostgreSQL is running
if ! pg_isready &> /dev/null; then
    echo "⚠️  PostgreSQL is not running."
    echo ""
    echo "🔧 Start PostgreSQL:"
    echo "   macOS: brew services start postgresql@14"
    echo "   Linux: sudo systemctl start postgresql"
    echo ""
    read -p "Press Enter after starting PostgreSQL..."
fi

echo "✅ PostgreSQL is running"
echo ""

# Get database credentials
read -p "Enter PostgreSQL username (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -p "Enter PostgreSQL password: " -s DB_PASSWORD
echo ""

read -p "Enter database name (default: minihelpdesk): " DB_NAME
DB_NAME=${DB_NAME:-minihelpdesk}

read -p "Enter PostgreSQL host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Enter PostgreSQL port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

# Create database
echo ""
echo "📦 Creating database '$DB_NAME'..."
export PGPASSWORD=$DB_PASSWORD

# Check if database exists
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "✅ Database '$DB_NAME' already exists"
else
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Database '$DB_NAME' created successfully"
    else
        echo "❌ Failed to create database. Please check your credentials."
        exit 1
    fi
fi

# Update .env file
echo ""
echo "📝 Updating .env file..."
cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# Server Port
PORT=5000

# JWT Secret
JWT_SECRET=minihelpdesk-secret-key-change-in-production
EOF

echo "✅ .env file updated"
echo ""
echo "🎉 Database setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Start the server: npm start"
echo "   2. The tables will be created automatically on first run"
echo ""

