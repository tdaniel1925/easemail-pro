/**
 * Migration script to add unique constraint for attachments
 * This prevents duplicate attachments from being inserted
 *
 * Run with: node scripts/add-attachment-unique-constraint.mjs
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🧹 Step 1: Removing duplicate attachments...');

    // First, identify and remove duplicates (keeping oldest)
    const deleteResult = await client.query(`
      WITH duplicates AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY email_id, nylas_attachment_id
                 ORDER BY created_at ASC
               ) as row_num
        FROM attachments
        WHERE email_id IS NOT NULL AND nylas_attachment_id IS NOT NULL
      )
      DELETE FROM attachments
      WHERE id IN (
        SELECT id FROM duplicates WHERE row_num > 1
      )
    `);

    console.log(`✅ Removed ${deleteResult.rowCount} duplicate attachments`);

    console.log('🔧 Step 2: Adding unique constraint...');

    // Check if constraint already exists
    const constraintCheck = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'attachments'
        AND constraint_name = 'attachments_email_attachment_unique'
    `);

    if (constraintCheck.rows.length > 0) {
      console.log('⚠️  Unique constraint already exists, skipping...');
    } else {
      // Add the unique index
      await client.query(`
        CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
          attachments_email_attachment_unique
        ON attachments (email_id, nylas_attachment_id)
        WHERE email_id IS NOT NULL AND nylas_attachment_id IS NOT NULL
      `);

      console.log('✅ Unique constraint added successfully');
    }

    console.log('🎉 Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
