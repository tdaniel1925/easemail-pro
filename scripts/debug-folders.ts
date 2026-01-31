/**
 * Debug folder syncing issues
 * Run: npx tsx scripts/debug-folders.ts <email>
 */

import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { emailAccounts, emailFolders, emails } from '../lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

const NYLAS_API_KEY = process.env.NYLAS_API_KEY;
const NYLAS_API_URI = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';

const email = process.argv[2];

async function debugFolders() {
  console.log(`\n🔍 Debugging folder sync issues...\n`);

  try {
    // Step 1: Get account from database
    let account;
    if (email) {
      console.log(`Looking for account: ${email}`);
      account = await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.emailAddress, email),
      });
    } else {
      // Get all accounts
      const accounts = await db.query.emailAccounts.findMany({});
      console.log(`Found ${accounts.length} total accounts\n`);

      for (const acc of accounts) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Account: ${acc.emailAddress}`);
        console.log(`${'='.repeat(60)}`);
        await checkAccountFolders(acc);
      }
      return;
    }

    if (!account) {
      console.error(`❌ No account found for ${email}`);
      process.exit(1);
    }

    await checkAccountFolders(account);

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

async function checkAccountFolders(account: any) {
  console.log(`\nAccount ID: ${account.id}`);
  console.log(`Provider: ${account.provider}`);
  console.log(`Grant ID: ${account.nylasGrantId || 'N/A'}\n`);

  // Step 2: Get folders from Nylas
  if (account.nylasGrantId) {
    console.log('📂 Folders in Nylas:');
    console.log('-'.repeat(60));

    try {
      const foldersResponse = await fetch(
        `${NYLAS_API_URI}/v3/grants/${account.nylasGrantId}/folders`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${NYLAS_API_KEY}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!foldersResponse.ok) {
        console.error(`❌ Failed to fetch folders: ${foldersResponse.status}`);
        const errorData = await foldersResponse.json();
        console.error(JSON.stringify(errorData, null, 2));
      } else {
        const foldersData = await foldersResponse.json();
        console.log(`Found ${foldersData.data?.length || 0} folders in Nylas\n`);

        if (foldersData.data && foldersData.data.length > 0) {
          // Group by parent
          const rootFolders = foldersData.data.filter((f: any) => !f.parent_id);
          const childFolders = foldersData.data.filter((f: any) => f.parent_id);

          console.log('Root folders:');
          rootFolders.forEach((folder: any) => {
            console.log(`  📁 ${folder.name} (${folder.id})`);
            console.log(`     Type: ${folder.attributes?.join(', ') || 'custom'}`);

            // Show children
            const children = childFolders.filter((f: any) => f.parent_id === folder.id);
            children.forEach((child: any) => {
              console.log(`     └─ ${child.name} (${child.id})`);
            });
          });

          console.log('\nCustom/User folders:');
          const customFolders = foldersData.data.filter((f: any) => {
            const attrs = f.attributes || [];
            return !attrs.includes('inbox') &&
                   !attrs.includes('sent') &&
                   !attrs.includes('drafts') &&
                   !attrs.includes('spam') &&
                   !attrs.includes('trash') &&
                   !attrs.includes('all');
          });

          if (customFolders.length > 0) {
            customFolders.forEach((folder: any) => {
              console.log(`  📂 ${folder.name} (${folder.id})`);
            });
          } else {
            console.log('  (none found)');
          }
        }
      }
    } catch (error: any) {
      console.error(`❌ Error fetching from Nylas: ${error.message}`);
    }

    console.log('\n' + '-'.repeat(60));
  }

  // Step 3: Get folders from database
  console.log('\n📂 Folders in Database:');
  console.log('-'.repeat(60));

  const dbFolders = await db.query.emailFolders.findMany({
    where: eq(emailFolders.accountId, account.id),
  });

  console.log(`Found ${dbFolders.length} folders in database\n`);

  if (dbFolders.length > 0) {
    // Group by type
    const systemFolders = dbFolders.filter(f =>
      ['inbox', 'sent', 'drafts', 'spam', 'trash', 'all'].includes(f.folderType || '')
    );
    const customFolders = dbFolders.filter(f =>
      !['inbox', 'sent', 'drafts', 'spam', 'trash', 'all'].includes(f.folderType || '')
    );

    console.log('System folders:');
    systemFolders.forEach(folder => {
      console.log(`  📁 ${folder.displayName} (${folder.folderType})`);
      console.log(`     Nylas Folder ID: ${folder.nylasFolderId}`);
      console.log(`     Unread: ${folder.unreadCount || 0} | Total: ${folder.totalCount || 0}`);
    });

    console.log('\nCustom folders:');
    if (customFolders.length > 0) {
      customFolders.forEach(folder => {
        console.log(`  📂 ${folder.displayName}`);
        console.log(`     Nylas Folder ID: ${folder.nylasFolderId}`);
        console.log(`     Type: ${folder.folderType || 'custom'}`);
        console.log(`     Unread: ${folder.unreadCount || 0} | Total: ${folder.totalCount || 0}`);
      });
    } else {
      console.log('  ❌ NO CUSTOM FOLDERS IN DATABASE!');
      console.log('  This could be why emails in custom folders are not showing.');
    }
  }

  console.log('\n' + '-'.repeat(60));

  // Step 4: Check email counts in database by folder name
  console.log('\n📧 Email Distribution in Database:');
  console.log('-'.repeat(60));

  const emailCounts = await db
    .select({
      folder: emails.folder,
      count: sql<number>`count(*)::int`,
    })
    .from(emails)
    .where(eq(emails.accountId, account.id))
    .groupBy(emails.folder);

  if (emailCounts.length > 0) {
    emailCounts.forEach(row => {
      console.log(`  ${row.folder || '(no folder)'}: ${row.count} emails`);
    });

    const totalEmails = emailCounts.reduce((sum, row) => sum + row.count, 0);
    console.log(`\n  Total emails: ${totalEmails}`);
  } else {
    console.log('  ❌ No emails found in database for this account!');
  }

  console.log('\n' + '-'.repeat(60));

  // Step 5: Check sync status
  console.log('\n🔄 Sync Status:');
  console.log('-'.repeat(60));
  console.log(`Sync Status: ${account.syncStatus || 'N/A'}`);
  console.log(`Last Synced: ${account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleString() : 'Never'}`);
  console.log(`Initial Sync Complete: ${account.initialSyncCompleted ? 'Yes' : 'No'}`);

  // Recommendations
  console.log('\n💡 Recommendations:');
  console.log('-'.repeat(60));

  if (!account.initialSyncCompleted) {
    console.log('⚠️  Initial sync not complete - trigger a full sync');
  }

  const dbFolderCount = dbFolders.length;
  if (dbFolderCount === 0) {
    console.log('⚠️  No folders in database - folders need to be synced first');
    console.log('   Solution: Call /api/nylas-v3/folders to sync folders');
  }

  const customDbFolders = dbFolders.filter(f =>
    !['inbox', 'sent', 'drafts', 'spam', 'trash', 'all'].includes(f.folderType || '')
  );

  if (customDbFolders.length === 0) {
    console.log('⚠️  No custom folders in database');
    console.log('   Possible causes:');
    console.log('   1. Folder sync only syncing system folders');
    console.log('   2. Custom folders not being saved to database');
    console.log('   3. Folder type detection filtering out custom folders');
  }

  console.log('');
}

debugFolders();
