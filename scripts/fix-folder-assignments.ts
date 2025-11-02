/**
 * Migration Script: Fix Folder Assignments
 * 
 * Purpose: Corrects emails that were incorrectly assigned to 'inbox' due to the
 * sanitizeText bug. Uses the folders array (which was stored correctly) to
 * reassign emails to their proper folders.
 * 
 * Usage: node --loader tsx scripts/fix-folder-assignments.ts [--account-id=xxx] [--dry-run]
 */

import { db } from '../lib/db/drizzle';
import { emails, emailAccounts } from '../lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { assignEmailFolder } from '../lib/email/folder-utils';

interface MigrationStats {
  totalEmails: number;
  incorrectlyAssigned: number;
  fixed: number;
  errors: number;
  byFolder: Record<string, number>;
}

interface FixOptions {
  accountId?: string;
  dryRun?: boolean;
}

async function fixFolderAssignments(options: FixOptions = {}) {
  const { accountId, dryRun = false } = options;

  console.log('🔧 Starting Folder Assignment Migration');
  console.log('========================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`);
  console.log(`Account Filter: ${accountId || 'ALL ACCOUNTS'}`);
  console.log('');

  const stats: MigrationStats = {
    totalEmails: 0,
    incorrectlyAssigned: 0,
    fixed: 0,
    errors: 0,
    byFolder: {},
  };

  try {
    // Get accounts to process
    const accounts = accountId
      ? await db.query.emailAccounts.findFirst({ where: eq(emailAccounts.id, accountId) }).then(a => a ? [a] : [])
      : await db.query.emailAccounts.findMany();

    if (accounts.length === 0) {
      console.error('❌ No accounts found');
      return stats;
    }

    console.log(`📧 Processing ${accounts.length} account(s)...`);
    console.log('');

    for (const account of accounts) {
      console.log(`\n📬 Account: ${account.emailAddress}`);
      console.log(`   ID: ${account.id}`);

      // Find emails that might be incorrectly assigned
      // These are emails where folder='inbox' but folders array has non-inbox folders
      const accountEmails = await db.query.emails.findMany({
        where: eq(emails.accountId, account.id),
      });

      console.log(`   Total emails: ${accountEmails.length}`);
      stats.totalEmails += accountEmails.length;

      let accountFixed = 0;
      let accountErrors = 0;

      for (const email of accountEmails) {
        try {
          // Check if email might be incorrectly assigned
          const currentFolder = email.folder;
          const foldersArray = email.folders as string[] | null;

          // Skip if no folders array
          if (!foldersArray || foldersArray.length === 0) {
            continue;
          }

          // Calculate what the folder SHOULD be
          const correctFolder = assignEmailFolder(foldersArray);

          // Check if it's incorrect
          if (currentFolder !== correctFolder) {
            stats.incorrectlyAssigned++;
            
            // Track by folder type
            stats.byFolder[correctFolder] = (stats.byFolder[correctFolder] || 0) + 1;

            console.log(`   🔄 Found mismatch:`);
            console.log(`      Email: ${email.subject?.substring(0, 50) || 'No subject'}`);
            console.log(`      Current: "${currentFolder}" → Correct: "${correctFolder}"`);
            console.log(`      Folders array: ${JSON.stringify(foldersArray)}`);

            if (!dryRun) {
              // Update the email
              await db.update(emails)
                .set({ 
                  folder: correctFolder,
                  updatedAt: new Date(),
                })
                .where(eq(emails.id, email.id));

              console.log(`      ✅ Fixed!`);
              stats.fixed++;
              accountFixed++;
            } else {
              console.log(`      ℹ️  Would fix (dry run mode)`);
              stats.fixed++; // Count as "would fix" in dry run
              accountFixed++;
            }
          }
        } catch (error: any) {
          console.error(`   ❌ Error processing email ${email.id}:`, error.message);
          stats.errors++;
          accountErrors++;
        }
      }

      console.log(`   Summary: ${accountFixed} fixed, ${accountErrors} errors`);
    }

    // Final summary
    console.log('\n');
    console.log('========================================');
    console.log('📊 Migration Summary');
    console.log('========================================');
    console.log(`Total emails processed: ${stats.totalEmails}`);
    console.log(`Incorrectly assigned: ${stats.incorrectlyAssigned}`);
    console.log(`${dryRun ? 'Would fix' : 'Fixed'}: ${stats.fixed}`);
    console.log(`Errors: ${stats.errors}`);
    console.log('');
    console.log('By folder:');
    Object.entries(stats.byFolder).forEach(([folder, count]) => {
      console.log(`  ${folder}: ${count} emails`);
    });
    console.log('');

    if (dryRun) {
      console.log('⚠️  This was a DRY RUN - no changes were made');
      console.log('   Run without --dry-run to apply changes');
    } else {
      console.log('✅ Migration completed successfully!');
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    throw error;
  }

  return stats;
}

// Parse command line arguments
function parseArgs(): FixOptions {
  const args = process.argv.slice(2);
  const options: FixOptions = {
    dryRun: false,
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--account-id=')) {
      options.accountId = arg.split('=')[1];
    } else if (arg === '--help') {
      console.log(`
Usage: node --loader tsx scripts/fix-folder-assignments.ts [options]

Options:
  --account-id=<id>    Only fix emails for specific account
  --dry-run           Show what would be fixed without making changes
  --help              Show this help message

Examples:
  # Dry run to see what would be fixed
  node --loader tsx scripts/fix-folder-assignments.ts --dry-run

  # Fix all accounts
  node --loader tsx scripts/fix-folder-assignments.ts

  # Fix specific account only
  node --loader tsx scripts/fix-folder-assignments.ts --account-id=abc-123

  # Dry run for specific account
  node --loader tsx scripts/fix-folder-assignments.ts --account-id=abc-123 --dry-run
      `);
      process.exit(0);
    }
  }

  return options;
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  fixFolderAssignments(options)
    .then((stats) => {
      process.exit(stats.errors > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { fixFolderAssignments };

