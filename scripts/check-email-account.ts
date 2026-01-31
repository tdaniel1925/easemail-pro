/**
 * Check email account in database
 * Run: npx tsx scripts/check-email-account.ts trenttdaniel@gmail.com
 */

import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { emailAccounts } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

const email = process.argv[2] || 'trenttdaniel@gmail.com';

async function checkAccount() {
  console.log(`\n🔍 Checking database for: ${email}\n`);

  try {
    const accounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.emailAddress, email),
    });

    if (accounts.length === 0) {
      console.log('❌ No account found in database');
      console.log('\nPossible issues:');
      console.log('1. Account was not properly saved after OAuth');
      console.log('2. Email address mismatch');
      console.log('3. Account was deleted');
      process.exit(1);
    }

    console.log(`Found ${accounts.length} account(s):\n`);

    accounts.forEach((account, idx) => {
      console.log(`Account ${idx + 1}:`);
      console.log(`  ID: ${account.id}`);
      console.log(`  Email: ${account.emailAddress}`);
      console.log(`  Provider: ${account.provider}`);
      console.log(`  Nylas Grant ID: ${account.nylasGrantId || 'N/A'}`);
      console.log(`  Access Token: ${account.accessToken ? 'Present' : 'Missing'}`);
      console.log(`  Refresh Token: ${account.refreshToken ? 'Present' : 'Missing'}`);
      console.log(`  Token Expires: ${account.tokenExpiresAt ? new Date(account.tokenExpiresAt).toLocaleString() : 'N/A'}`);
      console.log(`  Sync Status: ${account.syncStatus || 'N/A'}`);
      console.log(`  Last Synced: ${account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleString() : 'Never'}`);
      console.log(`  Initial Sync Complete: ${account.initialSyncCompleted ? 'Yes' : 'No'}`);
      console.log(`  User ID: ${account.userId}`);
      console.log('');
    });

    // Check if grant ID matches
    const grantId = '758ac167-5308-4dce-815e-5bd92a9e73bc';
    const matchingAccount = accounts.find(acc => acc.nylasGrantId === grantId);

    if (matchingAccount) {
      console.log('✅ Grant ID matches database account');
    } else {
      console.log('⚠️  Grant ID does NOT match any database account');
      console.log(`Expected grant ID: ${grantId}`);
      console.log('Stored grant IDs:', accounts.map(a => a.nylasGrantId).join(', '));
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

checkAccount();
