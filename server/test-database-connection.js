const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? {
    rejectUnauthorized: false
  } : undefined
});

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('📊 Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
    
    const client = await pool.connect();
    console.log('✅ Connected to database!');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Database is responding');
    console.log('   Current time:', result.rows[0].current_time);
    console.log('   PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    
    // Check if workspaces table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'workspaces'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Workspaces table exists');
      
      // Count workspaces
      const countResult = await client.query('SELECT COUNT(*) FROM workspaces');
      console.log('   Current workspaces:', countResult.rows[0].count);
    } else {
      console.log('⚠️  Workspaces table does not exist (will be created on server start)');
    }
    
    client.release();
    await pool.end();
    console.log('\n✅ Database connection test successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
