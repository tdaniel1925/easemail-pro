import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAccountsWithPendingCharges } from '@/lib/billing/automated-billing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/billing/pending
 * 
 * Get preview of upcoming charges
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient();
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

    // Get pending charges
    const pendingCharges = await getAccountsWithPendingCharges();

    // Calculate totals
    const summary = {
      totalAccounts: pendingCharges.length,
      totalCharges: pendingCharges.reduce((sum, p) => sum + p.totalCharges, 0),
      accountsWithoutPaymentMethod: pendingCharges.filter(p => !p.hasPaymentMethod).length,
      breakdown: {
        sms: pendingCharges.reduce((sum, p) => sum + p.smsCharges, 0),
        ai: pendingCharges.reduce((sum, p) => sum + p.aiCharges, 0),
        storage: pendingCharges.reduce((sum, p) => sum + p.storageCharges, 0),
      },
    };

    return NextResponse.json({
      success: true,
      summary,
      pendingCharges: pendingCharges.map(p => ({
        userId: p.userId,
        organizationId: p.organizationId,
        charges: {
          sms: p.smsCharges,
          ai: p.aiCharges,
          storage: p.storageCharges,
          total: p.totalCharges,
        },
        hasPaymentMethod: p.hasPaymentMethod,
        isPromoUser: p.isPromoUser,
      })),
    });
  } catch (error: any) {
    console.error('Get pending charges API error:', error);
    return NextResponse.json(
      { error: 'Failed to get pending charges', details: error.message },
      { status: 500 }
    );
  }
}

