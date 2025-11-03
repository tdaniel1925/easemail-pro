import { NextRequest, NextResponse } from 'next/server';
import { processAutomatedBilling } from '@/lib/billing/automated-billing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

/**
 * GET /api/cron/billing
 * 
 * Automated billing cron job
 * Triggered by Vercel Cron or external scheduler
 * 
 * Requires CRON_SECRET in environment variables
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (!process.env.CRON_SECRET) {
      console.error('❌ CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }
    
    if (authHeader !== expectedAuth) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🕐 Automated billing cron job started');
    console.log('📅 Time:', new Date().toISOString());

    // Run billing process
    const result = await processAutomatedBilling();

    console.log('✅ Billing cron job completed');
    console.log(`   Accounts processed: ${result.accountsProcessed}`);
    console.log(`   Successful charges: ${result.chargesSuccessful}`);
    console.log(`   Failed charges: ${result.chargesFailed}`);
    console.log(`   Total amount: $${result.totalAmountCharged.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      message: 'Automated billing completed',
      timestamp: new Date().toISOString(),
      result: {
        runId: result.runId,
        accountsProcessed: result.accountsProcessed,
        chargesSuccessful: result.chargesSuccessful,
        chargesFailed: result.chargesFailed,
        totalAmountCharged: result.totalAmountCharged,
        errorCount: result.errors.length,
      },
    });
  } catch (error: any) {
    console.error('❌ Billing cron job error:', error);
    
    // Still return 200 to prevent Vercel from retrying automatically
    // We handle retries internally
    return NextResponse.json({
      success: false,
      error: 'Billing cron job failed',
      details: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  }
}

