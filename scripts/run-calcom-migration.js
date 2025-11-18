/**
 * Script to run the Cal.com integration migration
 * Run with: node scripts/run-calcom-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read from .env.local
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  console.log('📦 Reading Cal.com migration file...\n');

  const migrationPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20250118000001_create_calcom_integration.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('SQL to execute:');
  console.log('═'.repeat(80));
  console.log(sql.substring(0, 500) + '...\n[truncated for display]');
  console.log('═'.repeat(80));
  console.log('\n🚀 Executing Cal.com migration...\n');

  try {
    await pool.query(sql);
    console.log('✅ Cal.com migration executed successfully!\n');

    // Verify tables were created
    const tables = ['calcom_connections', 'calcom_bookings', 'calcom_webhook_events'];

    for (const tableName of tables) {
      const result = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      console.log(`📊 Table structure for ${tableName}:`);
      console.table(result.rows);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
