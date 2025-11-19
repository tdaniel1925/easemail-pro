/**
 * Payment Retry Cron Job
 * 
 * Runs daily to retry scheduled payment attempts
 * Path: /api/cron/retry-payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { retryScheduledPayments } from '@/lib/billing/dunning-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized payment retry attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[Cron] Starting payment retry run');
    
    const startTime = Date.now();
    const result = await retryScheduledPayments();
    const duration = Date.now() - startTime;
    
    console.log(
      `[Cron] Payment retry completed in ${duration}ms: ` +
      `${result.attempted} attempted, ${result.succeeded} succeeded, ${result.failed} failed`
    );
    
    return NextResponse.json({
      success: true,
      attempted: result.attempted,
      succeeded: result.succeeded,
      failed: result.failed,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Payment retry failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

