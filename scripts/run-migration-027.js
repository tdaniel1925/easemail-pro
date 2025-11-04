#!/usr/bin/env node

/**
 * Run Database Migration: Add continuation_count column
 * 
 * Usage: 
 *   node scripts/run-migration-027.js
 * 
 * Required Environment Variable:
 *   DATABASE_URL - Your production database connection string
 */

const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Starting migration 027: Add continuation_count column\n');

  // Dynamic import for postgres
  const postgres = (await import('postgres')).default;
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    console.error('   Please set your production database URL in .env.local\n');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, {
    max: 1, // Single connection for migration
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/027_add_continuation_count.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📋 SQL to execute:');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));
    console.log();

    // Execute migration
    console.log('⚙️  Executing migration...');
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Verifying column exists...');

    // Verify the column was added
    const result = await sql`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'email_accounts' 
        AND column_name = 'continuation_count'
    `;

    if (result.length > 0) {
      console.log('✅ Column verified:');
      console.log(`   - Name: ${result[0].column_name}`);
      console.log(`   - Type: ${result[0].data_type}`);
      console.log(`   - Default: ${result[0].column_default}`);
      console.log();
      console.log('🎉 Migration successful! You can now deploy to Vercel.\n');
    } else {
      console.log('⚠️  Warning: Column not found after migration');
      console.log('   This might be normal if it already existed.\n');
    }

    await sql.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error();
    
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Note: Column may already exist (not an error)');
      console.log('   Vercel deployment should proceed normally.\n');
      await sql.end();
      process.exit(0);
    }

    console.error('Full error:', error);
    await sql.end();
    process.exit(1);
  }
}

// Run migration
runMigration();

