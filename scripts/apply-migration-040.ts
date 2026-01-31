/**
 * Apply migration 040 - Re-normalize folders after webhook fixes
 * Run: npx tsx scripts/apply-migration-040.ts
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../lib/db/drizzle';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  console.log('\n🔄 Applying Migration 040: Re-normalize folders after webhook fixes\n');
  console.log('This migration will:');
  console.log('  - Fix Microsoft folder IDs (base64 strings) → reset to inbox');
  console.log('  - Re-normalize Gmail folder names (e.g., [Gmail]/Sent Mail → sent)');
  console.log('  - Re-normalize Microsoft folder names (e.g., Sent Items → sent)');
  console.log('  - Safe to run multiple times (idempotent)\n');

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'migrations', '040_re_normalize_folders_post_webhook_fix.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded successfully\n');
    console.log('⚠️  This may take a few seconds if you have many emails...\n');

    // Execute the migration
    const startTime = Date.now();

    // Execute as a single SQL statement
    await db.execute(sql.raw(migrationSQL));

    const duration = Date.now() - startTime;

    console.log('\n✅ Migration 040 applied successfully!');
    console.log(`⏱️  Duration: ${duration}ms\n`);
    console.log('📊 Check the output above for statistics on emails updated.\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:');
    console.error(error);
    console.error('\nPossible causes:');
    console.error('  - Database connection issue');
    console.error('  - Migration already applied (safe to ignore if output shows 0 updates)');
    console.error('  - Database permissions issue\n');
    process.exit(1);
  }

  process.exit(0);
}

applyMigration();
