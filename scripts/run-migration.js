/**
 * Simple script to run the email_summaries migration
 * Run with: node scripts/run-migration.js
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
  console.log('📦 Reading migration file...\n');

  const migrationPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20250118000000_create_email_summaries.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('SQL to execute:');
  console.log('═'.repeat(80));
  console.log(sql);
  console.log('═'.repeat(80));
  console.log('\n🚀 Executing migration...\n');

  try {
    await pool.query(sql);
    console.log('✅ Migration executed successfully!\n');

    // Verify table was created
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'email_summaries'
      ORDER BY ordinal_position;
    `);

    console.log('📊 Table structure:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
