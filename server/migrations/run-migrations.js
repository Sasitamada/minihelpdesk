/**
 * Migration Runner
 * Runs database migrations in order
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configure pool with SSL for Render.com PostgreSQL
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

// Add SSL configuration if DATABASE_URL contains 'render.com' or 'neon.tech'
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('render.com') || process.env.DATABASE_URL.includes('neon.tech'))) {
  poolConfig.ssl = {
    rejectUnauthorized: false // Required for Render.com and Neon
  };
}

const pool = new Pool(poolConfig);

async function runMigrations() {
  const migrationsDir = path.join(__dirname);
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && f !== 'run-migrations.js')
    .sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    console.log(`\nRunning migration: ${file}`);
    try {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      console.log(`✅ ${file} completed`);
    } catch (error) {
      // Check if error is because extension already exists or column already exists
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate') ||
          error.message.includes('column') && error.message.includes('already exists')) {
        console.log(`⚠️  ${file} - Some changes already applied (skipping): ${error.message.split('\n')[0]}`);
      } else {
        console.error(`❌ ${file} failed:`, error.message);
        throw error;
      }
    }
  }

  console.log('\n✅ All migrations completed!');
  await pool.end();
}

runMigrations().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});

