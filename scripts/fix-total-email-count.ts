/**
 * One-time script to fix totalEmailCount for existing accounts
 * Run with: npx tsx scripts/fix-total-email-count.ts
 */

import { db } from '../lib/db/drizzle';
import { emailAccounts } from '../lib/db/schema';
import { eq, or, isNull } from 'drizzle-orm';

async function fixTotalEmailCounts() {
  console.log('🔧 Fixing sync progress for existing accounts...\n');

  // Get all accounts to check if syncProgress needs updating
  const accounts = await db.query.emailAccounts.findMany();

  console.log(`Found ${accounts.length} total accounts\n`);

  let updatedCount = 0;

  for (const account of accounts) {
    const syncedCount = account.syncedEmailCount || 0;
    const totalCount = account.totalEmailCount || 0;
    const currentProgress = account.syncProgress || 0;

    // Only update if account has emails AND progress is less than 90%
    // (This catches accounts stuck at 2%, 4%, etc.)
    if (syncedCount > 0 && totalCount > 0 && currentProgress < 90) {
      // Calculate correct progress
      const correctProgress = Math.min(Math.round((syncedCount / totalCount) * 100), 100);

      await db.update(emailAccounts)
        .set({
          syncProgress: correctProgress,
        })
        .where(eq(emailAccounts.id, account.id));

      console.log(`✅ ${account.emailAddress}: Updated progress from ${currentProgress}% to ${correctProgress}% (${syncedCount.toLocaleString()}/${totalCount.toLocaleString()} emails)`);
      updatedCount++;
    } else if (syncedCount > 0 && totalCount === 0) {
      // Set totalEmailCount if missing
      await db.update(emailAccounts)
        .set({
          totalEmailCount: syncedCount,
          syncProgress: 100,
        })
        .where(eq(emailAccounts.id, account.id));

      console.log(`✅ ${account.emailAddress}: Set totalEmailCount to ${syncedCount.toLocaleString()} and progress to 100%`);
      updatedCount++;
    }
  }

  console.log(`\n✨ Done! Updated ${updatedCount} account(s).`);
  console.log('💡 Refresh your sync status page to see the updated progress.');
  process.exit(0);
}

fixTotalEmailCounts().catch((error) => {
  console.error('❌ Error fixing total email counts:', error);
  process.exit(1);
});
