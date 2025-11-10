/**
 * Cleanup Old Webhooks
 * Removes per-account webhooks and consolidates to a single application-wide webhook
 */

import { getNylasClient } from '@/lib/nylas-v3/config';

async function cleanupWebhooks() {
  try {
    console.log('🧹 Cleaning up old Nylas webhooks...\n');

    const nylas = getNylasClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

    // Get all webhooks
    const response = await nylas.webhooks.list();
    const webhooks = response.data;

    console.log(`Found ${webhooks.length} webhook(s)\n`);

    // Identify webhooks to delete
    const webhooksToDelete = webhooks.filter((wh: any) => {
      // Delete old per-account webhooks at /api/webhooks/nylas
      if (wh.webhookUrl?.includes('/api/webhooks/nylas') && !wh.webhookUrl?.includes('nylas-v3')) {
        return true;
      }
      // Delete webhooks pointing to wrong domain
      if (!wh.webhookUrl?.includes(appUrl.replace('http://localhost:3001', 'easemail.app'))) {
        return false; // Keep production webhooks even if domain doesn't match local
      }
      return false;
    });

    const webhooksToKeep = webhooks.filter((wh: any) => {
      // Keep the modern v3 webhook
      if (wh.webhookUrl?.includes('/api/nylas-v3/webhooks')) {
        return true;
      }
      return false;
    });

    console.log(`📋 Analysis:`);
    console.log(`   - Webhooks to DELETE: ${webhooksToDelete.length} (old per-account webhooks)`);
    console.log(`   - Webhooks to KEEP: ${webhooksToKeep.length} (modern v3 webhook)\n`);

    // Show what will be deleted
    if (webhooksToDelete.length > 0) {
      console.log('🗑️  Deleting old webhooks:');
      for (const wh of webhooksToDelete) {
        console.log(`   - ${wh.id}: ${wh.webhookUrl}`);
        console.log(`     Description: ${wh.description || 'N/A'}`);

        try {
          await nylas.webhooks.destroy({ webhookId: wh.id });
          console.log(`     ✅ Deleted\n`);
        } catch (error: any) {
          console.error(`     ❌ Failed to delete: ${error.message}\n`);
        }
      }
    } else {
      console.log('✅ No old webhooks to delete\n');
    }

    // Check if we have the correct v3 webhook
    const correctWebhook = webhooksToKeep.find((wh: any) =>
      wh.webhookUrl === 'https://easemail.app/api/nylas-v3/webhooks'
    );

    if (correctWebhook) {
      console.log('✅ Modern webhook already exists:');
      console.log(`   ID: ${correctWebhook.id}`);
      console.log(`   URL: ${correctWebhook.webhookUrl}`);
      console.log(`   Triggers: ${correctWebhook.triggerTypes?.length || 0} events`);
      console.log('\n✅ Webhook cleanup complete!');
    } else {
      console.log('⚠️  No modern webhook found. Run: npm run setup-webhooks');
    }

  } catch (error: any) {
    console.error('❌ Error cleaning up webhooks:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

cleanupWebhooks();
