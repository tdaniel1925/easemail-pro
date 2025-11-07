/**
 * Diagnostic script to check email sync status
 * Run with: npx tsx scripts/check-sync-status.ts
 */

import { db } from '../lib/db/drizzle';
import { emailAccounts, emails } from '../lib/db/schema';
import { eq, count, desc } from 'drizzle-orm';

async function checkSyncStatus() {
  console.log('🔍 Checking email sync status...\n');

  // Get all email accounts
  const accounts = await db.query.emailAccounts.findMany({
    orderBy: [desc(emailAccounts.createdAt)],
  });

  if (accounts.length === 0) {
    console.log('❌ No email accounts found');
    return;
  }

  for (const account of accounts) {
    console.log(`\n========================================`);
    console.log(`📧 Account: ${account.emailAddress}`);
    console.log(`========================================`);
    console.log(`Provider: ${account.emailProvider || account.nylasProvider || 'Unknown'}`);
    console.log(`Sync Status: ${account.syncStatus || 'Not started'}`);
    console.log(`Sync Progress: ${account.syncProgress || 0}%`);
    console.log(`Initial Sync Completed: ${account.initialSyncCompleted ? '✅ Yes' : '❌ No'}`);
    console.log(`Last Synced: ${account.lastSyncedAt ? account.lastSyncedAt.toISOString() : 'Never'}`);
    console.log(`Synced Email Count: ${(account.syncedEmailCount || 0).toLocaleString()}`);
    console.log(`Total Email Count: ${(account.totalEmailCount || 0).toLocaleString()}`);
    console.log(`Continuation Count: ${account.continuationCount || 0}`);
    console.log(`Retry Count: ${account.retryCount || 0}`);
    console.log(`Sync Cursor: ${account.syncCursor ? account.syncCursor.substring(0, 30) + '...' : 'None'}`);

    if (account.lastError) {
      console.log(`\n⚠️ Last Error: ${account.lastError}`);
    }

    // Count emails in database for this account
    const emailCountResult = await db
      .select({ count: count() })
      .from(emails)
      .where(eq(emails.accountId, account.id));

    const actualEmailCount = emailCountResult[0]?.count || 0;
    console.log(`\n📊 Actual Emails in Database: ${actualEmailCount.toLocaleString()}`);

    // Count by folder
    const folderCounts = await db
      .select({
        folder: emails.folder,
        count: count(),
      })
      .from(emails)
      .where(eq(emails.accountId, account.id))
      .groupBy(emails.folder);

    console.log(`\n📁 Emails by Folder:`);
    for (const folder of folderCounts) {
      console.log(`   - ${folder.folder}: ${folder.count.toLocaleString()}`);
    }

    // Check if there's a mismatch
    if (actualEmailCount !== (account.syncedEmailCount || 0)) {
      console.log(`\n⚠️ MISMATCH: Database count (${actualEmailCount}) != syncedEmailCount (${account.syncedEmailCount || 0})`);
    }

    // Show most recent emails
    const recentEmails = await db.query.emails.findMany({
      where: eq(emails.accountId, account.id),
      orderBy: [desc(emails.receivedAt)],
      limit: 3,
    });

    console.log(`\n📨 Most Recent Emails:`);
    for (const email of recentEmails) {
      console.log(`   - ${email.receivedAt?.toISOString()} | ${email.folder} | ${email.subject?.substring(0, 50)}`);
    }
  }

  console.log(`\n========================================\n`);
}

checkSyncStatus()
  .then(() => {
    console.log('✅ Status check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error checking status:', error);
    process.exit(1);
  });
