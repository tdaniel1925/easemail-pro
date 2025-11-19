/**
 * Revenue Recognition Cron Job
 * 
 * Runs monthly to recognize scheduled revenue for annual subscriptions
 * Path: /api/cron/recognize-revenue
 */

import { NextRequest, NextResponse } from 'next/server';
import { recognizeScheduledRevenue } from '@/lib/accounting/revenue-recognition';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized revenue recognition attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[Cron] Starting revenue recognition run');
    
    const startTime = Date.now();
    const result = await recognizeScheduledRevenue();
    const duration = Date.now() - startTime;
    
    console.log(
      `[Cron] Revenue recognition completed in ${duration}ms: ` +
      `$${result.recognized.toFixed(2)} recognized across ${result.schedules} schedules`
    );
    
    return NextResponse.json({
      success: true,
      recognizedAmount: result.recognized,
      schedulesProcessed: result.schedules,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Revenue recognition failed:', error);
    
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

