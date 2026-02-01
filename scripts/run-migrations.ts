/**
 * Run SQL Migrations
 * Applies SQL migration files to the database
 */

import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

// List of migrations to run (in order)
const MIGRATIONS_TO_RUN = [
  '041_add_two_factor_auth.sql',
  '042_add_performance_indexes.sql',
  '043_create_email_labels_junction.sql',
];

async function runMigration(filename: string): Promise<void> {
  const filePath = path.join(MIGRATIONS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Migration file not found: ${filename}`);
    return;
  }

  console.log(`\n📄 Running migration: ${filename}`);

  try {
    const migrationSQL = fs.readFileSync(filePath, 'utf-8');

    // Remove comments and execute as a single transaction
    const cleanedSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .trim();

    if (cleanedSQL.length > 0) {
      // Execute the entire migration as one transaction
      await db.execute(sql.raw(cleanedSQL));
    }

    console.log(`✅ Migration completed: ${filename}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`);
    console.error('Error:', error);
    throw error; // Stop on first failure
  }
}

async function main() {
  console.log('🚀 Starting database migrations...\n');
  console.log(`Database: ${process.env.DATABASE_URL?.substring(0, 30)}...`);
  console.log(`Migrations directory: ${MIGRATIONS_DIR}\n`);

  for (const migration of MIGRATIONS_TO_RUN) {
    await runMigration(migration);
  }

  console.log('\n✅ All migrations completed successfully!');
  process.exit(0);
}

main().catch((error) => {
  console.error('\n❌ Migration process failed:', error);
  process.exit(1);
});
