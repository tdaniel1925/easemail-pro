const { db } = require('../lib/db/drizzle');
const { emailAccounts, emails } = require('../lib/db/schema');
const { eq, count } = require('drizzle-orm');

async function checkSyncStatus() {
  try {
    console.log('Checking sync status...\n');

    // Get all email accounts
    const accounts = await db.query.emailAccounts.findMany();

    if (accounts.length === 0) {
      console.log('No email accounts found');
      return;
    }

    for (const account of accounts) {
      console.log('='.repeat(80));
      console.log(`Account: ${account.emailAddress}`);
      console.log(`ID: ${account.id}`);
      console.log(`Provider: ${account.emailProvider || account.nylasProvider}`);
      console.log('-'.repeat(80));

      // Sync status
      console.log(`Sync Status: ${account.syncStatus || 'unknown'}`);
      console.log(`Sync Progress: ${account.syncProgress || 0}%`);
      console.log(`Synced Emails: ${account.syncedEmailCount || 0}`);
      console.log(`Total Emails: ${account.totalEmailCount || 0}`);
      console.log(`Initial Sync Completed: ${account.initialSyncCompleted ? 'Yes' : 'No'}`);

      // Timing
      console.log(`Last Synced At: ${account.lastSyncedAt || 'Never'}`);
      console.log(`Last Activity At: ${account.lastActivityAt || 'Never'}`);

      // Errors
      if (account.lastError) {
        console.log(`\nLast Error: ${account.lastError}`);
        console.log(`Retry Count: ${account.retryCount || 0}`);
        console.log(`Last Retry At: ${account.lastRetryAt || 'Never'}`);
      }

      // Check actual email count in database
      const emailCountResult = await db
        .select({ count: count() })
        .from(emails)
        .where(eq(emails.accountId, account.id));

      const actualEmailCount = emailCountResult[0]?.count || 0;
      console.log(`\nActual Emails in DB: ${actualEmailCount}`);

      // Metadata
      if (account.metadata) {
        console.log('\nMetadata:');
        console.log(JSON.stringify(account.metadata, null, 2));
      }

      console.log('='.repeat(80));
      console.log('\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking sync status:', error);
    process.exit(1);
  }
}

checkSyncStatus();
