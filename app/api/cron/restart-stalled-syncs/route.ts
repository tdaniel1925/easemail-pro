import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailAccounts } from '@/lib/db/schema';
import { and, eq, or, lt } from 'drizzle-orm';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute max

/**
 * Cron Job: Restart Stalled Email Syncs
 * Runs every 10 minutes to detect and restart syncs that got stuck
 * 
 * A sync is considered "stalled" if:
 * 1. syncStatus is 'syncing' or 'background_syncing'
 * 2. lastSyncedAt is more than 10 minutes ago
 * 3. syncStopped flag is false (not manually stopped)
 * 
 * ✅ FIX #7: Safety net for continuation failures
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized cron job access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Checking for stalled email syncs...');

    // Find accounts that are stuck syncing (last update > 10 minutes ago)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const stalledAccounts = await db.query.emailAccounts.findMany({
      where: and(
        or(
          eq(emailAccounts.syncStatus, 'syncing'),
          eq(emailAccounts.syncStatus, 'background_syncing')
        ),
        lt(emailAccounts.lastSyncedAt, tenMinutesAgo),
        eq(emailAccounts.syncStopped, false) // Don't restart manually stopped syncs
      ),
      columns: {
        id: true,
        emailAddress: true,
        syncStatus: true,
        lastSyncedAt: true,
        syncedEmailCount: true,
        syncProgress: true,
        syncCursor: true,
        continuationCount: true,
      },
    });

    if (stalledAccounts.length === 0) {
      console.log('✅ No stalled syncs found - all syncs are healthy');
      return NextResponse.json({ 
        success: true, 
        message: 'No stalled syncs found',
        checked: 0,
        restarted: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`⚠️ Found ${stalledAccounts.length} stalled sync(s):`);
    stalledAccounts.forEach(account => {
      const minutesStalled = Math.round((Date.now() - new Date(account.lastSyncedAt!).getTime()) / 60000);
      console.log(`  - ${account.emailAddress || account.id}`);
      console.log(`    Status: ${account.syncStatus}`);
      console.log(`    Last update: ${minutesStalled} minutes ago`);
      console.log(`    Progress: ${account.syncProgress}% (${account.syncedEmailCount?.toLocaleString() || 0} emails)`);
      console.log(`    Continuation: ${account.continuationCount || 0}`);
    });

    // Restart each stalled sync
    const restartResults = await Promise.allSettled(
      stalledAccounts.map(async (account) => {
        try {
          console.log(`🔄 Restarting sync for ${account.emailAddress || account.id}...`);
          
          // Trigger background sync continuation
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/sync/background`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: account.id }),
          });

          if (!response.ok) {
            throw new Error(`API responded with ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          console.log(`✅ Successfully restarted sync for ${account.emailAddress || account.id}:`, data);
          
          // Log to Sentry for monitoring
          Sentry.captureMessage(`Restarted stalled sync for ${account.emailAddress}`, {
            level: 'info',
            tags: {
              accountId: account.id,
              emailAddress: account.emailAddress || 'unknown',
              syncProgress: account.syncProgress,
              continuationCount: account.continuationCount,
            },
          });

          return { success: true, accountId: account.id };
        } catch (error) {
          console.error(`❌ Failed to restart sync for ${account.emailAddress || account.id}:`, error);
          
          // Log error to Sentry
          Sentry.captureException(error, {
            tags: {
              accountId: account.id,
              emailAddress: account.emailAddress || 'unknown',
              operation: 'restart_stalled_sync',
            },
          });

          return { success: false, accountId: account.id, error };
        }
      })
    );

    // Count successes and failures
    const succeeded = restartResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = restartResults.length - succeeded;

    const duration = Date.now() - startTime;
    
    console.log(`✅ Stalled sync restart complete:`);
    console.log(`   - Checked: ${stalledAccounts.length} stalled sync(s)`);
    console.log(`   - Restarted: ${succeeded} successful`);
    console.log(`   - Failed: ${failed}`);
    console.log(`   - Duration: ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: `Restarted ${succeeded}/${stalledAccounts.length} stalled sync(s)`,
      checked: stalledAccounts.length,
      restarted: succeeded,
      failed,
      duration,
      accounts: stalledAccounts.map(a => ({
        id: a.id,
        emailAddress: a.emailAddress,
        progress: a.syncProgress,
        syncedEmails: a.syncedEmailCount,
      })),
    });
  } catch (error) {
    console.error('❌ Stalled sync restart cron job failed:', error);
    
    // Log to Sentry
    Sentry.captureException(error, {
      tags: {
        operation: 'restart_stalled_syncs_cron',
      },
    });

    return NextResponse.json({ 
      error: 'Cron job failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}

