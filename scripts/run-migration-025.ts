/**
 * Run Email Templates Migration Directly from SQL File
 */

import { sql } from 'drizzle-orm';
import { db } from '../lib/db/drizzle';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('🚀 Running email templates migration from SQL file...\n');

  try {
    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), 'migrations', '025_email_templates_system.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    // Execute the SQL
    await db.execute(sql.raw(sqlContent));

    console.log('✅ Migration completed successfully!');
    console.log('\nNext step: Run the populate script:');
    console.log('npx tsx scripts/populate-email-templates.ts');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed');
    process.exit(1);
  });
