/**
 * Script to verify Cal.com tables exist
 * Run with: node scripts/verify-calcom-migration.js
 */

const { Pool } = require('pg');

// Read from .env.local
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyTables() {
  console.log('🔍 Verifying Cal.com tables...\n');

  try {
    const tables = ['calcom_connections', 'calcom_bookings', 'calcom_webhook_events'];

    for (const tableName of tables) {
      const result = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      if (result.rows.length === 0) {
        console.log(`❌ Table ${tableName} does NOT exist\n`);
      } else {
        console.log(`✅ Table ${tableName} exists with ${result.rows.length} columns:`);
        console.table(result.rows);
        console.log();
      }
    }

    console.log('✅ Verification complete!\n');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyTables();
