import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Auto-resume endpoint for paused syncs
 * This endpoint should be called periodically (e.g., via cron job or client polling)
 * to automatically resume syncs that failed continuation
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Checking for paused syncs to auto-resume...');

    // Find all accounts with pending_resume status
    const pausedAccounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.syncStatus, 'pending_resume'),
    });

    if (pausedAccounts.length === 0) {
      console.log('✅ No paused syncs found');
      return NextResponse.json({
        success: true,
        message: 'No paused syncs to resume',
        resumed: 0,
      });
    }

    console.log(`📋 Found ${pausedAccounts.length} paused sync(s)`);

    const resumedAccounts: string[] = [];
    const failedAccounts: { accountId: string; error: string }[] = [];

    for (const account of pausedAccounts) {
      const metadata = account.metadata as any || {};
      const resumeAfter = metadata.resumeAfter ? new Date(metadata.resumeAfter) : null;

      // Check if enough time has passed
      if (resumeAfter && resumeAfter > new Date()) {
        console.log(`⏳ Skipping ${account.emailAddress} - resume scheduled for ${resumeAfter.toISOString()}`);
        continue;
      }

      console.log(`🔄 Attempting to resume sync for ${account.emailAddress} (${account.id})`);

      try {
        // Reset status to background_syncing to allow restart
        await db.update(emailAccounts)
          .set({
            syncStatus: 'background_syncing',
            lastError: null,
            retryCount: 0,
            lastActivityAt: new Date(),
          })
          .where(eq(emailAccounts.id, account.id));

        // Trigger background sync
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.easemail.app';
        const response = await fetch(`${appUrl}/api/nylas/sync/background`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: account.id }),
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (!response.ok) {
          throw new Error(`Resume request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Resumed sync for ${account.emailAddress}:`, data);
        resumedAccounts.push(account.id);
      } catch (error) {
        console.error(`❌ Failed to resume sync for ${account.emailAddress}:`, error);

        // Mark as error after failed resume attempt
        await db.update(emailAccounts)
          .set({
            syncStatus: 'error',
            lastError: `Auto-resume failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please manually restart sync.`,
          })
          .where(eq(emailAccounts.id, account.id));

        failedAccounts.push({
          accountId: account.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Resumed ${resumedAccounts.length} sync(s), ${failedAccounts.length} failed`,
      resumed: resumedAccounts.length,
      failed: failedAccounts.length,
      resumedAccounts,
      failedAccounts,
    });
  } catch (error) {
    console.error('Auto-resume error:', error);
    return NextResponse.json(
      {
        error: 'Failed to auto-resume syncs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check how many syncs are pending resume
 */
export async function GET() {
  try {
    const pausedAccounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.syncStatus, 'pending_resume'),
      columns: {
        id: true,
        emailAddress: true,
        lastError: true,
        metadata: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: pausedAccounts.length,
      accounts: pausedAccounts.map(acc => ({
        id: acc.id,
        emailAddress: acc.emailAddress,
        lastError: acc.lastError,
        resumeAfter: (acc.metadata as any)?.resumeAfter || null,
      })),
    });
  } catch (error) {
    console.error('Error checking pending resumes:', error);
    return NextResponse.json(
      {
        error: 'Failed to check pending resumes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
