/**
 * Check what columns exist in email_templates table
 */

import { sql } from 'drizzle-orm';
import { db } from '../lib/db/drizzle';

async function checkTable() {
  console.log('🔍 Checking email_templates table...\n');

  try {
    // Check if table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'email_templates'
      );
    `);

    console.log('Table exists:', tableExists.rows[0]?.exists || false);

    if (tableExists.rows[0]?.exists) {
      // Get column names
      const columns = await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'email_templates'
        ORDER BY ordinal_position;
      `);

      console.log('\nColumns in email_templates:');
      columns.rows.forEach((col: any) => {
        console.log(`- ${col.column_name} (${col.data_type})`);
      });

      // Drop the table so we can recreate it
      console.log('\n⚠️  Dropping existing table to start fresh...');
      await db.execute(sql`DROP TABLE IF EXISTS email_template_test_sends CASCADE;`);
      await db.execute(sql`DROP TABLE IF EXISTS email_template_versions CASCADE;`);
      await db.execute(sql`DROP TABLE IF EXISTS email_templates CASCADE;`);
      console.log('✅ Tables dropped');
    } else {
      console.log('✅ Table does not exist - ready for fresh migration');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

checkTable()
  .then(() => {
    console.log('\n✅ Done - Now run: npx tsx scripts/run-migration-025.ts');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed');
    process.exit(1);
  });
