/**
 * Delete invalid grant from Nylas
 * This forces a fresh OAuth flow
 * Run: npx tsx scripts/delete-invalid-grant.ts <email>
 */

import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { emailAccounts } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

const NYLAS_API_KEY = process.env.NYLAS_API_KEY;
const NYLAS_API_URI = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';

const email = process.argv[2] || 'trenttdaniel@gmail.com';

async function deleteGrant() {
  console.log(`\n🗑️  Deleting invalid grant for: ${email}\n`);

  try {
    // Step 1: Find the grant
    console.log('Step 1: Finding grant in Nylas...');
    const grantsResponse = await fetch(`${NYLAS_API_URI}/v3/grants`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    const grantsData = await grantsResponse.json();
    const grant = grantsData.data.find((g: any) => g.email === email);

    if (!grant) {
      console.error(`❌ No grant found in Nylas for ${email}`);
      process.exit(1);
    }

    console.log(`✅ Found grant: ${grant.id}`);
    console.log(`   Status: ${grant.grant_status}`);

    // Step 2: Delete from Nylas
    console.log('\nStep 2: Deleting grant from Nylas...');
    const deleteResponse = await fetch(`${NYLAS_API_URI}/v3/grants/${grant.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (deleteResponse.status === 200 || deleteResponse.status === 204) {
      console.log('✅ Grant deleted from Nylas');
    } else {
      const errorData = await deleteResponse.json();
      console.error('❌ Failed to delete grant from Nylas:');
      console.error(JSON.stringify(errorData, null, 2));
    }

    // Step 3: Update database
    console.log('\nStep 3: Updating database...');
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.emailAddress, email),
    });

    if (account) {
      await db
        .update(emailAccounts)
        .set({
          nylasGrantId: null,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          syncStatus: 'paused',
          lastError: 'Grant deleted - account disconnected',
          updatedAt: new Date(),
        })
        .where(eq(emailAccounts.id, account.id));

      console.log('✅ Database updated');
    } else {
      console.log('⚠️  No database record found');
    }

    console.log('\n✅ Done! The account has been completely disconnected.');
    console.log('\nNext steps:');
    console.log('1. Go to your app');
    console.log('2. Navigate to Settings → Email Accounts');
    console.log('3. Click "Connect Gmail" to start fresh OAuth flow');
    console.log('4. Sign in with trenttdaniel@gmail.com');
    console.log('5. This will create a NEW valid grant\n');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

deleteGrant();
