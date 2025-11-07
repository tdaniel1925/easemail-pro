import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts, emails, emailFolders } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Debug/Verification API for Folder & Sync Issues
 * 
 * GET /api/debug/verification?accountId=xxx
 * 
 * Comprehensive health check for:
 * 1. localStorage cache status
 * 2. Account sync status and metrics
 * 3. Folder assignment correctness
 * 4. Sync continuation health
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = request.nextUrl.searchParams.get('accountId');
    
    if (!accountId) {
      return NextResponse.json({ error: 'accountId query parameter required' }, { status: 400 });
    }

    // Verify account belongs to user
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });
    
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized - Account does not belong to you' }, { status: 403 });
    }

    console.log(`🔍 Running verification for account: ${account.emailAddress || accountId}`);

    // 1. Account Sync Status
    const syncStatus = {
      status: account.syncStatus,
      progress: account.syncProgress,
      lastSyncedAt: account.lastSyncedAt,
      syncCursor: account.syncCursor ? `${account.syncCursor.substring(0, 50)}...` : null,
      syncedEmailCount: account.syncedEmailCount,
      totalEmailCount: account.totalEmailCount,
      continuationCount: account.continuationCount,
      initialSyncCompleted: account.initialSyncCompleted,
      syncStopped: account.syncStopped,
      retryCount: account.retryCount,
      lastError: account.lastError,
    };

    // 2. Folder Statistics
    const folderStats = await db
      .select({
        folder: emails.folder,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(emails)
      .where(eq(emails.accountId, accountId))
      .groupBy(emails.folder);

    // 3. Check for folders in database
    const dbFolders = await db.query.emailFolders.findMany({
      where: eq(emailFolders.accountId, accountId),
      columns: {
        id: true,
        displayName: true,
        folderType: true,
        parentFolderId: true,
      },
    });

    // 4. Total email count
    const totalEmailsResult = await db
      .select({
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(emails)
      .where(eq(emails.accountId, accountId));

    const totalEmails = totalEmailsResult[0]?.count || 0;

    // 5. Check if sync is stalled
    const lastSyncDate = account.lastSyncedAt ? new Date(account.lastSyncedAt) : null;
    const minutesSinceLastSync = lastSyncDate 
      ? Math.round((Date.now() - lastSyncDate.getTime()) / 60000)
      : null;
    
    const isSyncStalled = 
      (account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing') &&
      minutesSinceLastSync !== null &&
      minutesSinceLastSync > 10;

    // 6. Continuation Health
    const continuationHealth = {
      currentCount: account.continuationCount || 0,
      maxAllowed: 100,
      percentageUsed: Math.round(((account.continuationCount || 0) / 100) * 100),
      isHealthy: (account.continuationCount || 0) < 80, // Warn if > 80% used
      estimatedTimeElapsed: `${Math.round((account.continuationCount || 0) * 4)} minutes`,
    };

    // 7. Sync Health Assessment
    const syncHealth = {
      isStalled: isSyncStalled,
      minutesSinceLastSync,
      needsRestart: isSyncStalled,
      hasCursor: !!account.syncCursor,
      canResume: !!account.syncCursor && account.continuationCount! < 100,
      estimatedCompletion: account.syncProgress 
        ? account.syncProgress >= 99 
          ? 'Nearly complete'
          : account.syncProgress >= 50
            ? 'More than halfway'
            : 'Early stages'
        : 'Unknown',
    };

    // 8. Folder Assignment Health
    const folderHealth = {
      totalFoldersInDb: dbFolders.length,
      totalEmailsDistributed: folderStats.reduce((sum, f) => sum + f.count, 0),
      folderDistribution: folderStats.map(f => ({
        folder: f.folder || 'unknown',
        count: f.count,
        percentage: Math.round((f.count / totalEmails) * 100),
      })),
      hasInboxEmails: folderStats.some(f => f.folder?.toLowerCase() === 'inbox'),
      hasSentEmails: folderStats.some(f => f.folder?.toLowerCase().includes('sent')),
      hasProperDistribution: folderStats.length > 1, // More than just inbox
    };

    // 9. localStorage Cache Keys (client-side - provide example)
    const expectedLocalStorageKeys = [
      `easemail_folders_${accountId}`,
      `easemail_folder_counts_${accountId}`,
    ];

    // 10. Overall Health Score
    let healthScore = 100;
    const issues: string[] = [];
    const warnings: string[] = [];

    if (isSyncStalled) {
      healthScore -= 30;
      issues.push(`Sync is stalled (${minutesSinceLastSync} minutes since last update)`);
    }

    if (account.lastError) {
      healthScore -= 20;
      issues.push(`Has error: ${account.lastError.substring(0, 100)}`);
    }

    if ((account.continuationCount || 0) > 80) {
      healthScore -= 15;
      warnings.push(`High continuation count (${account.continuationCount}/100)`);
    }

    if (!folderHealth.hasProperDistribution) {
      healthScore -= 10;
      warnings.push('All emails in one folder - may indicate folder assignment issue');
    }

    if (totalEmails === 0 && account.syncProgress! > 50) {
      healthScore -= 25;
      issues.push('Sync progress indicates emails should exist, but none found');
    }

    // 11. Recommendations
    const recommendations: string[] = [];

    if (isSyncStalled) {
      recommendations.push('Restart sync using: POST /api/nylas/sync/background with { "accountId": "..." }');
    }

    if ((account.continuationCount || 0) > 90) {
      recommendations.push('Sync nearing max continuations - monitor closely or increase MAX_CONTINUATIONS');
    }

    if (!folderHealth.hasProperDistribution && totalEmails > 100) {
      recommendations.push('Review folder assignment logic in folder-utils.ts');
    }

    if (account.syncProgress! < 100 && account.syncStatus === 'completed') {
      recommendations.push('Sync marked complete but progress < 100% - may need cursor reset');
    }

    // 12. Quick Actions
    const quickActions = [
      {
        action: 'restart_sync',
        description: 'Restart sync from last cursor position',
        endpoint: 'POST /api/nylas/sync/background',
        payload: { accountId },
      },
      {
        action: 'force_restart',
        description: 'Force restart sync (reset cursor)',
        endpoint: 'POST /api/nylas/sync/diagnostic',
        payload: { accountId, action: 'force_restart' },
      },
      {
        action: 'reset_cursor',
        description: 'Reset cursor to start fresh sync',
        endpoint: 'POST /api/nylas/sync/diagnostic',
        payload: { accountId, action: 'reset_cursor' },
      },
      {
        action: 'clear_cache',
        description: 'Clear localStorage cache (run in browser console)',
        code: `localStorage.removeItem('easemail_folders_${accountId}'); localStorage.removeItem('easemail_folder_counts_${accountId}');`,
      },
    ];

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      account: {
        id: accountId,
        email: account.emailAddress,
        provider: account.emailProvider,
        nylasProvider: account.nylasProvider,
      },
      healthScore: Math.max(healthScore, 0),
      status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'critical',
      issues,
      warnings,
      recommendations,
      syncStatus,
      syncHealth,
      folderHealth,
      continuationHealth,
      dbFolders: dbFolders.map(f => ({
        displayName: f.displayName,
        type: f.folderType,
        hasParent: !!f.parentFolderId,
      })),
      expectedLocalStorageKeys,
      quickActions,
      totalEmails,
    });
  } catch (error) {
    console.error('Verification API error:', error);
    return NextResponse.json({ 
      error: 'Verification failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST: Perform automated fixes
 * 
 * POST /api/debug/verification?accountId=xxx&action=fix_stalled_sync
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = request.nextUrl.searchParams.get('accountId');
    const action = request.nextUrl.searchParams.get('action');
    
    if (!accountId || !action) {
      return NextResponse.json({ 
        error: 'accountId and action query parameters required',
        validActions: ['fix_stalled_sync', 'clear_error'],
      }, { status: 400 });
    }

    // Verify account belongs to user
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });
    
    if (!account || account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized or account not found' }, { status: 403 });
    }

    if (action === 'fix_stalled_sync') {
      // Restart the sync
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/sync/background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      const data = await response.json();

      return NextResponse.json({
        success: true,
        message: 'Sync restarted',
        result: data,
      });
    }

    if (action === 'clear_error') {
      await db.update(emailAccounts)
        .set({
          lastError: null,
          retryCount: 0,
        })
        .where(eq(emailAccounts.id, accountId));

      return NextResponse.json({
        success: true,
        message: 'Error cleared',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Verification fix error:', error);
    return NextResponse.json({ 
      error: 'Fix failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

