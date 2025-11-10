/**
 * Setup Nylas Webhooks for Production
 * Run this script after deploying to register webhooks
 */

import { getNylasClient } from '@/lib/nylas-v3/config';
import { WebhookTriggers } from 'nylas';

async function setupWebhooks() {
  try {
    console.log('🔧 Setting up Nylas webhooks...\n');

    const nylas = getNylasClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const webhookUrl = `${appUrl}/api/nylas-v3/webhooks`;

    if (!appUrl || appUrl.includes('localhost')) {
      console.error('❌ ERROR: NEXT_PUBLIC_APP_URL is not set or is localhost');
      console.error('   Webhooks require a publicly accessible URL');
      console.error('\n   Current value:', appUrl);
      console.error('\n   For development, use ngrok:');
      console.error('   1. Run: ngrok http 3001');
      console.error('   2. Set NEXT_PUBLIC_APP_URL to the ngrok URL');
      console.error('   3. Restart your dev server');
      process.exit(1);
    }

    console.log(`📍 App URL: ${appUrl}`);
    console.log(`📍 Webhook URL: ${webhookUrl}\n`);

    // Define all webhook triggers we want to listen for
    const triggers: WebhookTriggers[] = [
      // Grant lifecycle events
      WebhookTriggers.GrantCreated,
      WebhookTriggers.GrantUpdated,
      WebhookTriggers.GrantExpired,
      WebhookTriggers.GrantDeleted,

      // Email events (most important for real-time sync)
      WebhookTriggers.MessageCreated,
      WebhookTriggers.MessageUpdated,
      WebhookTriggers.MessageDeleted,

      // Folder events
      WebhookTriggers.FolderCreated,
      WebhookTriggers.FolderUpdated,
      WebhookTriggers.FolderDeleted,
    ];

    console.log('📋 Registering for these events:');
    triggers.forEach(trigger => console.log(`   - ${trigger}`));
    console.log('');

    // Check if webhook already exists
    const existingWebhooks = await nylas.webhooks.list();
    const existingWebhook = existingWebhooks.data.find(
      (wh: any) => wh.webhookUrl === webhookUrl
    );

    if (existingWebhook) {
      console.log('🔄 Webhook already exists, updating...');
      console.log(`   Existing ID: ${existingWebhook.id}\n`);

      const updated = await nylas.webhooks.update({
        webhookId: existingWebhook.id,
        requestBody: {
          triggerTypes: triggers,
          webhookUrl,
          description: 'EaseMail automatic email sync (updated)',
        },
      });

      console.log('✅ Webhook updated successfully!');
      console.log(`   ID: ${updated.data.id}`);
      console.log(`   URL: ${updated.data.webhookUrl}`);
      console.log(`   Triggers: ${updated.data.triggerTypes?.length || 0} events`);
    } else {
      console.log('➕ Creating new webhook...\n');

      const created = await nylas.webhooks.create({
        requestBody: {
          triggerTypes: triggers,
          webhookUrl,
          description: 'EaseMail automatic email sync',
        },
      });

      console.log('✅ Webhook created successfully!');
      console.log(`   ID: ${created.data.id}`);
      console.log(`   URL: ${created.data.webhookUrl}`);
      console.log(`   Triggers: ${created.data.triggerTypes?.length || 0} events`);
    }

    console.log('\n🎉 Webhooks are now configured!');
    console.log('   Your users will receive real-time email notifications.');
    console.log('\n💡 To verify, run: npm run check-webhooks');

  } catch (error: any) {
    console.error('❌ Error setting up webhooks:', error.message);

    if (error.statusCode === 401) {
      console.error('\n   Authentication failed. Check your NYLAS_API_KEY');
    } else if (error.statusCode === 400) {
      console.error('\n   Bad request. The webhook URL may be invalid or unreachable');
      console.error('   Make sure your production URL is publicly accessible');
    }

    console.error('\nFull error:', error);
    process.exit(1);
  }
}

setupWebhooks();
