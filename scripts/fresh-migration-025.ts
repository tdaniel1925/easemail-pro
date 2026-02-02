/**
 * Fresh Email Templates Migration
 * Drops existing tables and recreates them
 */

import { sql } from 'drizzle-orm';
import { db } from '../lib/db/drizzle';
import * as fs from 'fs';
import * as path from 'path';

async function runFreshMigration() {
  console.log('🚀 Running fresh email templates migration...\n');

  try {
    // Step 1: Drop existing tables
    console.log('1️⃣  Dropping existing tables (if any)...');
    await db.execute(sql`DROP TABLE IF EXISTS email_template_test_sends CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS email_template_versions CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS email_templates CASCADE;`);
    console.log('✅ Old tables dropped\n');

    // Step 2: Read and execute the SQL file
    console.log('2️⃣  Creating fresh tables from SQL file...');
    const sqlFilePath = path.join(process.cwd(), 'migrations', '025_email_templates_system.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    await db.execute(sql.raw(sqlContent));
    console.log('✅ Tables created successfully!\n');

    console.log('🎉 Migration completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npx tsx scripts/populate-email-templates.ts');
    console.log('2. Visit: http://localhost:3001/admin/email-templates');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    throw error;
  }
}

runFreshMigration()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed');
    process.exit(1);
  });
