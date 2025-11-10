/**
 * Check Nylas Webhook Configuration
 * Run this script to see if webhooks are properly configured
 */

import { getNylasClient } from '@/lib/nylas-v3/config';

async function checkWebhooks() {
  try {
    console.log('🔍 Checking Nylas webhook configuration...\n');

    const nylas = getNylasClient();

    // Get all registered webhooks
    const response = await nylas.webhooks.list();
    const webhooks = response.data;

    console.log(`Found ${webhooks.length} registered webhook(s)\n`);

    if (webhooks.length === 0) {
      console.log('❌ NO WEBHOOKS REGISTERED');
      console.log('\nThis is why you\'re not receiving real-time email notifications!');
      console.log('\nTo fix this, run:');
      console.log('  npm run setup-webhooks');
      console.log('\nOr manually register via API:');
      console.log(`  POST ${process.env.NEXT_PUBLIC_APP_URL}/api/nylas-v3/webhooks/setup`);
      return;
    }

    // Display webhook details
    webhooks.forEach((webhook: any, index: number) => {
      console.log(`\n📍 Webhook ${index + 1}:`);
      console.log(`  ID: ${webhook.id}`);
      console.log(`  URL: ${webhook.webhookUrl}`);
      console.log(`  Description: ${webhook.description || 'N/A'}`);
      console.log(`  Status: ${webhook.webhookStatus || 'active'}`);
      console.log(`  Triggers: ${webhook.triggerTypes?.join(', ') || 'N/A'}`);

      // Check if URL matches current environment
      const currentUrl = process.env.NEXT_PUBLIC_APP_URL;
      const expectedWebhookUrl = `${currentUrl}/api/nylas-v3/webhooks`;

      if (webhook.webhookUrl !== expectedWebhookUrl) {
        console.log(`  ⚠️  WARNING: Webhook URL doesn't match current app URL`);
        console.log(`     Expected: ${expectedWebhookUrl}`);
        console.log(`     Got: ${webhook.webhookUrl}`);
      } else {
        console.log(`  ✅ URL matches current environment`);
      }
    });

    console.log('\n\n📋 Configuration Summary:');
    console.log(`  App URL: ${process.env.NEXT_PUBLIC_APP_URL}`);
    console.log(`  Expected Webhook URL: ${process.env.NEXT_PUBLIC_APP_URL}/api/nylas-v3/webhooks`);
    console.log(`  Nylas API: ${process.env.NYLAS_API_URI}`);
    console.log(`  Webhook Secret: ${process.env.NYLAS_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing'}`);

  } catch (error: any) {
    console.error('❌ Error checking webhooks:', error.message);
    console.error('\nFull error:', error);
  }
}

checkWebhooks();
