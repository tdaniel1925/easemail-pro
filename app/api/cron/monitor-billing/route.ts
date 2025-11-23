import { NextRequest, NextResponse } from 'next/server';
import { monitorBillingHealth, getBillingHealth } from '@/lib/billing/monitoring';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/monitor-billing
 * Cron job to monitor billing system health and send alerts
 * Should be run hourly via a cron service (e.g., Vercel Cron, GitHub Actions)
 *
 * Usage: curl -X POST https://yourdomain.com/api/cron/monitor-billing \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Starting billing health monitoring...');

    // Check health and send alerts if needed
    await monitorBillingHealth();

    // Get current health status
    const health = await getBillingHealth();

    console.log(`✅ Billing monitoring completed`);
    console.log(`   Status: ${health.status}`);
    console.log(`   Alerts: ${health.alerts.length}`);
    console.log(`   Failed transactions (24h): ${health.failedTransactions24h}`);
    console.log(`   Revenue today: $${health.revenueToday.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      health,
    });
  } catch (error: any) {
    console.error('❌ Billing monitoring failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to monitor billing health' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/monitor-billing
 * Get current billing health status (for admin dashboard)
 */
export async function GET(request: NextRequest) {
  try {
    const health = await getBillingHealth();

    return NextResponse.json({
      success: true,
      health,
    });
  } catch (error: any) {
    console.error('❌ Failed to get billing health:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get billing health' },
      { status: 500 }
    );
  }
}
