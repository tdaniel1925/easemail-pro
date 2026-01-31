/**
 * Debug Specific Nylas Grant
 * Run: npx tsx scripts/debug-grant.ts <email>
 */

import 'dotenv/config';

const NYLAS_API_KEY = process.env.NYLAS_API_KEY;
const NYLAS_API_URI = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';

const email = process.argv[2] || 'trenttdaniel@gmail.com';

async function debugGrant() {
  console.log(`\n🔍 Debugging account: ${email}\n`);

  try {
    // Step 1: Find the grant
    console.log('Step 1: Finding grant...');
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
      console.error(`❌ No grant found for ${email}`);
      console.log('\nAvailable accounts:');
      grantsData.data.forEach((g: any) => console.log(`  - ${g.email}`));
      process.exit(1);
    }

    console.log('✅ Grant found!');
    console.log(`   Grant ID: ${grant.id}`);
    console.log(`   Email: ${grant.email}`);
    console.log(`   Provider: ${grant.provider}`);
    console.log(`   Status: ${grant.grant_status}`);
    console.log(`   Created: ${new Date(grant.created_at * 1000).toLocaleString()}`);
    console.log(`   Updated: ${new Date(grant.updated_at * 1000).toLocaleString()}`);

    if (grant.grant_status !== 'valid') {
      console.error(`\n⚠️  Grant status is: ${grant.grant_status}`);
      console.error('This account needs re-authentication!');
      process.exit(1);
    }

    console.log('\n---\n');

    // Step 2: Test folders/labels access
    console.log('Step 2: Testing folder/label access...');
    const foldersResponse = await fetch(`${NYLAS_API_URI}/v3/grants/${grant.id}/folders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    console.log(`Status: ${foldersResponse.status} ${foldersResponse.statusText}`);

    if (!foldersResponse.ok) {
      const errorData = await foldersResponse.json();
      console.error('❌ Failed to fetch folders:');
      console.error(JSON.stringify(errorData, null, 2));

      if (foldersResponse.status === 401) {
        console.error('\n🔑 Authentication issue - Grant may need refresh');
      } else if (foldersResponse.status === 403) {
        console.error('\n🚫 Permission issue - Check OAuth scopes');
      } else if (foldersResponse.status === 429) {
        console.error('\n⏱️  Rate limit exceeded - Wait and try again');
      }
    } else {
      const foldersData = await foldersResponse.json();
      console.log(`✅ Found ${foldersData.data?.length || 0} folders/labels`);

      if (foldersData.data && foldersData.data.length > 0) {
        console.log('\nFolders:');
        foldersData.data.slice(0, 10).forEach((folder: any) => {
          console.log(`  - ${folder.name} (${folder.id})`);
        });
        if (foldersData.data.length > 10) {
          console.log(`  ... and ${foldersData.data.length - 10} more`);
        }
      }
    }

    console.log('\n---\n');

    // Step 3: Test messages access
    console.log('Step 3: Testing messages access...');
    const messagesResponse = await fetch(
      `${NYLAS_API_URI}/v3/grants/${grant.id}/messages?limit=5`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${NYLAS_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    console.log(`Status: ${messagesResponse.status} ${messagesResponse.statusText}`);

    if (!messagesResponse.ok) {
      const errorData = await messagesResponse.json();
      console.error('❌ Failed to fetch messages:');
      console.error(JSON.stringify(errorData, null, 2));

      if (messagesResponse.status === 401) {
        console.error('\n🔑 Authentication issue - Grant may need refresh');
      } else if (messagesResponse.status === 403) {
        console.error('\n🚫 Permission issue - Check OAuth scopes');
      } else if (messagesResponse.status === 429) {
        console.error('\n⏱️  Rate limit exceeded - Wait and try again');
      }
    } else {
      const messagesData = await messagesResponse.json();
      console.log(`✅ Found messages!`);
      console.log(`   Total in response: ${messagesData.data?.length || 0}`);

      if (messagesData.data && messagesData.data.length > 0) {
        console.log('\nRecent messages:');
        messagesData.data.forEach((msg: any, idx: number) => {
          const date = new Date(msg.date * 1000).toLocaleString();
          console.log(`  ${idx + 1}. From: ${msg.from?.[0]?.email || 'N/A'}`);
          console.log(`     Subject: ${msg.subject || '(no subject)'}`);
          console.log(`     Date: ${date}`);
          console.log('');
        });
      } else {
        console.log('\n⚠️  No messages returned. This could mean:');
        console.log('   - The inbox is empty');
        console.log('   - There\'s a sync issue');
        console.log('   - The account needs initial sync');
      }
    }

    console.log('\n---\n');

    // Step 4: Check calendar access (if Gmail)
    if (grant.provider === 'google') {
      console.log('Step 4: Testing calendar access...');
      const calendarsResponse = await fetch(
        `${NYLAS_API_URI}/v3/grants/${grant.id}/calendars`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${NYLAS_API_KEY}`,
            'Accept': 'application/json',
          },
        }
      );

      console.log(`Status: ${calendarsResponse.status} ${calendarsResponse.statusText}`);

      if (calendarsResponse.ok) {
        const calendarsData = await calendarsResponse.json();
        console.log(`✅ Found ${calendarsData.data?.length || 0} calendars`);
      } else {
        const errorData = await calendarsResponse.json();
        console.error('❌ Failed to fetch calendars:');
        console.error(JSON.stringify(errorData, null, 2));
      }
      console.log('\n---\n');
    }

    // Step 5: Check our database for this account
    console.log('Step 5: Checking database for email accounts...');
    console.log('Grant ID to look for:', grant.id);

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

debugGrant();
