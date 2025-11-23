const { db } = require('../lib/db/drizzle');
const { sql } = require('drizzle-orm');

async function runMigration() {
  try {
    console.log('🔄 Running webhook suppression migration...');

    // Add suppress_webhooks column
    await db.execute(sql`
      ALTER TABLE email_accounts
      ADD COLUMN IF NOT EXISTS suppress_webhooks BOOLEAN DEFAULT FALSE
    `);

    console.log('✅ Added suppress_webhooks column');

    // Add index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_email_accounts_suppress_webhooks
      ON email_accounts(suppress_webhooks)
      WHERE suppress_webhooks = true
    `);

    console.log('✅ Added index');

    // Add comment
    await db.execute(sql`
      COMMENT ON COLUMN email_accounts.suppress_webhooks IS 'Temporary flag to suppress webhook processing during initial sync to prevent race conditions'
    `);

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
