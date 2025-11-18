/**
 * Verify email_summaries table exists
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verify() {
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'email_summaries'
      );
    `);

    console.log('\n✅ Table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Show table structure
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'email_summaries'
        ORDER BY ordinal_position;
      `);

      console.log('\n📊 Table Structure:');
      console.table(structure.rows);

      // Check for data
      const count = await pool.query(`SELECT COUNT(*) FROM email_summaries;`);
      console.log('\n📈 Current summary count:', count.rows[0].count);
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verify();
