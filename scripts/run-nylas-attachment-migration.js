/**
 * Run Nylas Attachment Fields Migration
 */

const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not found');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');
  const sql = postgres(connectionString);

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add-nylas-attachment-fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Running migration: add-nylas-attachment-fields.sql');
    console.log(migrationSQL);
    console.log('');

    // Execute migration
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('New fields added to attachments table:');
    console.log('  - nylas_attachment_id (VARCHAR 255)');
    console.log('  - nylas_message_id (VARCHAR 255)');
    console.log('  - nylas_grant_id (VARCHAR 255)');
    console.log('  - storage_path now nullable (for backwards compatibility)');
    console.log('');
    console.log('Indexes created:');
    console.log('  - attachments_nylas_attachment_id_idx');
    console.log('  - attachments_nylas_message_id_idx');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
