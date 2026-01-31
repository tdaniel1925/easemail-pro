/**
 * Cron Job: Refresh Email Account Tokens
 *
 * Runs hourly to proactively refresh OAuth tokens before they expire
 * Prevents accounts from losing connection
 *
 * Schedule: Every hour (0 * * * *)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAndRefreshTokens } from '@/lib/email/token-refresh';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sets this header)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('⚠️ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 [Token Refresh Cron] Starting hourly token refresh check...');
    const startTime = Date.now();

    // Check and refresh tokens for all accounts
    const results = await checkAndRefreshTokens();

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    const duration = Date.now() - startTime;

    console.log(`✅ [Token Refresh Cron] Completed in ${duration}ms`, {
      total: results.length,
      refreshed: successCount,
      failed: failCount,
    });

    // Log failures for monitoring
    if (failCount > 0) {
      const failures = results.filter(r => !r.success);
      console.error('❌ [Token Refresh Cron] Failed refreshes:', failures.map(f => ({
        accountId: f.accountId,
        error: f.error,
      })));
    }

    return NextResponse.json({
      success: true,
      message: 'Token refresh completed',
      stats: {
        total: results.length,
        refreshed: successCount,
        failed: failCount,
        duration: `${duration}ms`,
      },
      failures: results.filter(r => !r.success).map(f => ({
        accountId: f.accountId,
        error: f.error,
      })),
    });

  } catch (error: any) {
    console.error('❌ [Token Refresh Cron] Fatal error:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Token refresh cron failed',
    }, { status: 500 });
  }
}
