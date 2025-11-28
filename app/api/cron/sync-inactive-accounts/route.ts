/**
 * Cron Job: Auto-Sync Inactive Email Accounts
 *
 * Runs every 4 hours to ensure all email accounts stay fresh,
 * even if the user isn't actively using the app.
 *
 * This provides Gmail/Outlook-like behavior where emails are
 * always synced in the background, not just on-demand.
 *
 * Accounts are synced if:
 * 1. Last sync was more than 4 hours ago
 * 2. Account is not currently syncing
 * 3. Account is not suspended or deactivated
 * 4. Account has a valid provider connection (grantId/token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailAccounts } from '@/lib/db/schema';
import { and, eq, lt, or, isNull, not, inArray } from 'drizzle-orm';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

// Sync accounts that haven't synced in 4 hours
const SYNC_THRESHOLD_HOURS = 4;

// Max accounts to sync per run (prevent overload)
const MAX_ACCOUNTS_PER_RUN = 50;

// Delay between triggering syncs (prevent API rate limits)
const DELAY_BETWEEN_SYNCS_MS = 2000;

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized cron job access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting inactive account sync job...');

    // Calculate threshold
    const thresholdTime = new Date(Date.now() - SYNC_THRESHOLD_HOURS * 60 * 60 * 1000);

    // Find accounts that need syncing
    const inactiveAccounts = await db.query.emailAccounts.findMany({
      where: and(
        // Not currently syncing
        not(inArray(emailAccounts.syncStatus, ['syncing', 'background_syncing', 'queued'])),
        // Last sync was before threshold (or never synced)
        or(
          lt(emailAccounts.lastSyncedAt, thresholdTime),
          isNull(emailAccounts.lastSyncedAt)
        ),
        // Not manually stopped
        eq(emailAccounts.syncStopped, false),
        // Has a valid Nylas grant (connected account)
        not(isNull(emailAccounts.nylasGrantId))
      ),
      columns: {
        id: true,
        emailAddress: true,
        provider: true,
        lastSyncedAt: true,
        syncedEmailCount: true,
        userId: true,
      },
      orderBy: (accounts, { asc }) => [asc(accounts.lastSyncedAt)], // Oldest first
      limit: MAX_ACCOUNTS_PER_RUN,
    });

    if (inactiveAccounts.length === 0) {
      console.log('✅ All accounts are up to date - no sync needed');
      return NextResponse.json({
        success: true,
        message: 'All accounts are up to date',
        checked: 0,
        triggered: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`📋 Found ${inactiveAccounts.length} account(s) needing sync:`);
    inactiveAccounts.forEach(account => {
      const lastSyncAgo = account.lastSyncedAt
        ? Math.round((Date.now() - new Date(account.lastSyncedAt).getTime()) / (1000 * 60 * 60))
        : 'never';
      console.log(`  - ${account.emailAddress || account.id} (last sync: ${lastSyncAgo}h ago)`);
    });

    // Trigger syncs with delay between each
    const syncResults = [];

    for (let i = 0; i < inactiveAccounts.length; i++) {
      const account = inactiveAccounts[i];

      try {
        console.log(`🔄 [${i + 1}/${inactiveAccounts.length}] Triggering sync for ${account.emailAddress || account.id}...`);

        // Trigger background sync
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/sync/background`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: account.id,
            source: 'cron-inactive-sync',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API responded with ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        syncResults.push({
          accountId: account.id,
          emailAddress: account.emailAddress,
          success: true,
          status: data.status || 'triggered',
        });

        console.log(`✅ Sync triggered for ${account.emailAddress || account.id}`);

        // Delay before next sync (except for last one)
        if (i < inactiveAccounts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_SYNCS_MS));
        }
      } catch (error) {
        console.error(`❌ Failed to trigger sync for ${account.emailAddress || account.id}:`, error);

        syncResults.push({
          accountId: account.id,
          emailAddress: account.emailAddress,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Log to Sentry
        Sentry.captureException(error, {
          tags: {
            operation: 'sync_inactive_account',
            accountId: account.id,
          },
        });
      }
    }

    // Summarize results
    const successCount = syncResults.filter(r => r.success).length;
    const failedCount = syncResults.filter(r => !r.success).length;
    const duration = Date.now() - startTime;

    console.log(`\n📊 Inactive account sync job complete:`);
    console.log(`   - Total checked: ${inactiveAccounts.length}`);
    console.log(`   - Successfully triggered: ${successCount}`);
    console.log(`   - Failed: ${failedCount}`);
    console.log(`   - Duration: ${duration}ms`);

    // Log summary to Sentry for monitoring
    if (successCount > 0) {
      Sentry.captureMessage(`Auto-sync triggered for ${successCount} inactive accounts`, {
        level: 'info',
        tags: {
          operation: 'cron_sync_inactive',
        },
        extra: {
          totalAccounts: inactiveAccounts.length,
          successCount,
          failedCount,
          duration,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Triggered sync for ${successCount}/${inactiveAccounts.length} inactive accounts`,
      checked: inactiveAccounts.length,
      triggered: successCount,
      failed: failedCount,
      duration,
      results: syncResults,
    });
  } catch (error) {
    console.error('❌ Inactive account sync cron job failed:', error);

    Sentry.captureException(error, {
      tags: {
        operation: 'cron_sync_inactive',
      },
    });

    return NextResponse.json({
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}
