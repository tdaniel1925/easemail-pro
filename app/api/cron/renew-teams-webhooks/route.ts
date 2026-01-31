/**
 * MS Teams Webhook Auto-Renewal Cron Job
 *
 * Prevents webhook expiration by renewing subscriptions before they expire.
 * Microsoft Teams webhooks expire after 1 hour, requiring continuous renewal.
 *
 * Schedule: Every 55 minutes (5 minute buffer before expiration)
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/renew-teams-webhooks",
 *     "schedule": "55 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teamsWebhookSubscriptions, teamsAccounts } from '@/lib/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { renewTeamsWebhookSubscription } from '@/lib/teams/teams-webhooks';
import { getValidAccessToken, encryptTokens } from '@/lib/teams/teams-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      console.error('❌ Unauthorized cron job request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting Teams webhook renewal cron job...');

    const startTime = Date.now();
    const stats = {
      total: 0,
      renewed: 0,
      failed: 0,
      skipped: 0,
    };

    // Find all active subscriptions expiring within the next 10 minutes
    const expirationThreshold = new Date(Date.now() + 10 * 60 * 1000);

    const expiringSubscriptions = await db
      .select({
        subscription: teamsWebhookSubscriptions,
        account: teamsAccounts,
      })
      .from(teamsWebhookSubscriptions)
      .innerJoin(
        teamsAccounts,
        eq(teamsWebhookSubscriptions.teamsAccountId, teamsAccounts.id)
      )
      .where(
        and(
          eq(teamsWebhookSubscriptions.status, 'active'),
          lt(teamsWebhookSubscriptions.expiresAt, expirationThreshold),
          eq(teamsAccounts.isActive, true)
        )
      );

    stats.total = expiringSubscriptions.length;

    console.log(
      `📊 Found ${stats.total} webhook subscriptions expiring within 10 minutes`
    );

    // Renew each subscription
    for (const { subscription, account } of expiringSubscriptions) {
      try {
        console.log(
          `🔄 Renewing subscription ${subscription.subscriptionId} for account ${account.email}`
        );

        // Get valid access token (automatically refreshes if expired)
        const tokenResult = await getValidAccessToken(
          account.accessToken,
          account.refreshToken,
          account.tokenExpiresAt
        );

        // If token was refreshed, update the database
        if (tokenResult.refreshed && tokenResult.newTokens) {
          const encryptedTokens = encryptTokens(tokenResult.newTokens);
          await db
            .update(teamsAccounts)
            .set({
              accessToken: encryptedTokens.accessToken,
              refreshToken: encryptedTokens.refreshToken,
              tokenExpiresAt: encryptedTokens.expiresAt,
              updatedAt: new Date(),
            })
            .where(eq(teamsAccounts.id, account.id));

          console.log(`✅ Refreshed access token for account ${account.email}`);
        }

        // Renew the webhook subscription
        const renewed = await renewTeamsWebhookSubscription(
          subscription.subscriptionId,
          tokenResult.accessToken
        );

        if (renewed) {
          stats.renewed++;
          console.log(
            `✅ Successfully renewed subscription ${subscription.subscriptionId}`
          );
        } else {
          stats.failed++;
          console.error(
            `❌ Failed to renew subscription ${subscription.subscriptionId}`
          );

          // Mark subscription as expired in database
          await db
            .update(teamsWebhookSubscriptions)
            .set({
              status: 'expired',
              updatedAt: new Date(),
            })
            .where(eq(teamsWebhookSubscriptions.id, subscription.id));
        }
      } catch (error: any) {
        stats.failed++;
        console.error(
          `❌ Error renewing subscription ${subscription.subscriptionId}:`,
          error
        );

        // Check if it's an auth error (token can't be refreshed)
        if (
          error.message?.includes('Token refresh failed') ||
          error.message?.includes('no refresh token available')
        ) {
          // Mark account as having an error
          await db
            .update(teamsAccounts)
            .set({
              syncStatus: 'error',
              lastError: `Token refresh failed: ${error.message}`,
              updatedAt: new Date(),
            })
            .where(eq(teamsAccounts.id, account.id));

          // Mark subscription as expired
          await db
            .update(teamsWebhookSubscriptions)
            .set({
              status: 'expired',
              updatedAt: new Date(),
            })
            .where(eq(teamsWebhookSubscriptions.id, subscription.id));

          console.log(
            `⚠️ Account ${account.email} needs to re-authenticate - marking subscription as expired`
          );
        }
      }
    }

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      stats,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Teams webhook renewal completed:', result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Teams webhook renewal cron job error:', error);
    return NextResponse.json(
      {
        error: 'Webhook renewal failed',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual renewal (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    // TODO: Add admin session verification here

    console.log('🔧 Manual Teams webhook renewal triggered');

    // Run the renewal process
    const result = await GET(request);

    return result;
  } catch (error: any) {
    console.error('❌ Manual Teams webhook renewal error:', error);
    return NextResponse.json(
      { error: 'Manual renewal failed', details: error.message },
      { status: 500 }
    );
  }
}
