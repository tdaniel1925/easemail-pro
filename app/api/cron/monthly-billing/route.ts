/**
 * Monthly Billing Cron Job
 * 
 * Runs on the 1st of each month to generate and process invoices
 * Path: /api/cron/monthly-billing
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateMonthlyInvoices } from '@/lib/billing/monthly-invoice-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized monthly billing attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[Cron] Starting monthly billing run');
    
    const startTime = Date.now();
    const result = await generateMonthlyInvoices();
    const duration = Date.now() - startTime;
    
    console.log(
      `[Cron] Monthly billing completed in ${duration}ms: ` +
      `${result.invoiceCount} invoices, $${result.totalAmount.toFixed(2)} total`
    );
    
    return NextResponse.json({
      success: true,
      invoicesGenerated: result.invoiceCount,
      totalAmount: result.totalAmount,
      failures: result.failures,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Monthly billing failed:', error);
    
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

