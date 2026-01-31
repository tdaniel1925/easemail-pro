/**
 * Test Nylas API Key Validity
 * Run: npx tsx scripts/test-nylas-api.ts
 */

import 'dotenv/config';

const NYLAS_API_KEY = process.env.NYLAS_API_KEY;
const NYLAS_API_URI = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';

async function testNylasAPI() {
  console.log('\n🔍 Testing Nylas API Connection...\n');

  if (!NYLAS_API_KEY) {
    console.error('❌ NYLAS_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log('✓ API Key found:', NYLAS_API_KEY.substring(0, 10) + '...');
  console.log('✓ API URI:', NYLAS_API_URI);
  console.log('\n---\n');

  try {
    // Test 1: Check API connectivity
    console.log('Test 1: Checking API connectivity...');
    const response = await fetch(`${NYLAS_API_URI}/v3/grants`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    console.log('Status:', response.status, response.statusText);

    if (response.status === 401) {
      console.error('\n❌ AUTHENTICATION FAILED');
      console.error('The API key is invalid or expired.');
      console.error('Solution: Get a new API key from https://dashboard.nylas.com/');
      process.exit(1);
    }

    if (response.status === 403) {
      console.error('\n❌ FORBIDDEN');
      console.error('The API key does not have permission to access this resource.');
      process.exit(1);
    }

    if (response.status === 429) {
      console.error('\n⚠️  RATE LIMIT EXCEEDED');
      console.error('Too many requests. Wait before trying again.');
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        console.error(`Retry after: ${retryAfter} seconds`);
      }
      process.exit(1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ API ERROR');
      console.error('Status:', response.status);
      console.error('Response:', errorText);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ API key is VALID!\n');

    // Display rate limit info
    const rateLimit = response.headers.get('X-RateLimit-Limit');
    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
    const rateLimitReset = response.headers.get('X-RateLimit-Reset');

    if (rateLimit) {
      console.log('📊 Rate Limit Info:');
      console.log(`  - Limit: ${rateLimit} requests`);
      console.log(`  - Remaining: ${rateLimitRemaining} requests`);
      if (rateLimitReset) {
        const resetDate = new Date(parseInt(rateLimitReset) * 1000);
        console.log(`  - Resets at: ${resetDate.toLocaleString()}`);
      }
      console.log('');
    }

    // Test 2: List grants (connected accounts)
    console.log('Test 2: Checking connected accounts (grants)...');
    console.log(`Found ${data.data?.length || 0} connected accounts\n`);

    if (data.data && data.data.length > 0) {
      console.log('📧 Connected Accounts:');
      data.data.forEach((grant: any, index: number) => {
        console.log(`\n${index + 1}. Grant ID: ${grant.id}`);
        console.log(`   Email: ${grant.email || 'N/A'}`);
        console.log(`   Provider: ${grant.provider || 'N/A'}`);
        console.log(`   Status: ${grant.grant_status || 'N/A'}`);

        if (grant.grant_status === 'invalid') {
          console.log('   ⚠️  This grant needs re-authentication!');
        } else if (grant.grant_status === 'valid') {
          console.log('   ✅ This grant is working correctly');
        }
      });
      console.log('');
    } else {
      console.log('ℹ️  No connected accounts found.');
      console.log('Users need to connect their email accounts through your app.\n');
    }

    // Test 3: Check application info
    console.log('Test 3: Checking Nylas application info...');
    const appResponse = await fetch(`${NYLAS_API_URI}/v3/applications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (appResponse.ok) {
      const appData = await appResponse.json();
      if (appData.data && appData.data.length > 0) {
        const app = appData.data[0];
        console.log('✅ Application found:');
        console.log(`   Name: ${app.name || 'N/A'}`);
        console.log(`   ID: ${app.id || 'N/A'}`);
        console.log('');
      }
    }

    console.log('✅ All tests passed!\n');
    console.log('═══════════════════════════════════════');
    console.log('Your Nylas API is properly configured!');
    console.log('═══════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);

    if (error.code === 'ENOTFOUND') {
      console.error('\n🌐 DNS/Network Error');
      console.error('Cannot resolve Nylas API hostname.');
      console.error('Check your internet connection and DNS settings.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n🔌 Connection Refused');
      console.error('Cannot connect to Nylas API.');
      console.error('Check if the API URI is correct.');
    }

    process.exit(1);
  }
}

testNylasAPI();
