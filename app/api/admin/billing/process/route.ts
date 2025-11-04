import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { processAutomatedBilling } from '@/lib/billing/automated-billing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for billing process

/**
 * POST /api/admin/billing/process
 * 
 * Manually trigger billing process
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    console.log('🚀 Manual billing process triggered by admin:', user.email);

    // Run billing process
    const result = await processAutomatedBilling({ enabled: true });

    return NextResponse.json({
      success: true,
      message: 'Billing process completed',
      result: {
        runId: result.runId,
        accountsProcessed: result.accountsProcessed,
        chargesSuccessful: result.chargesSuccessful,
        chargesFailed: result.chargesFailed,
        totalAmountCharged: result.totalAmountCharged,
        errors: result.errors,
      },
    });
  } catch (error: any) {
    console.error('Manual billing process error:', error);
    return NextResponse.json(
      { error: 'Failed to process billing', details: error.message },
      { status: 500 }
    );
  }
}

