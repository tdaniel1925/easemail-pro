import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, billingRuns } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/billing/history
 * 
 * Get billing run history
 * Query params:
 * - limit: number (default: 50)
 * - offset: number (default: 0)
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get billing runs
    const runs = await db.select()
      .from(billingRuns)
      .orderBy(desc(billingRuns.startedAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalCount = await db.select({
      count: db.$count(billingRuns),
    }).from(billingRuns);

    return NextResponse.json({
      success: true,
      runs: runs.map(r => ({
        id: r.id,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        status: r.status,
        accountsProcessed: r.accountsProcessed,
        chargesSuccessful: r.chargesSuccessful,
        chargesFailed: r.chargesFailed,
        totalAmountCharged: parseFloat(r.totalAmountChargedUsd || '0'),
        errorMessage: r.errorMessage,
        metadata: r.metadata,
      })),
      pagination: {
        limit,
        offset,
        total: totalCount[0]?.count || 0,
      },
    });
  } catch (error: any) {
    console.error('Get billing history API error:', error);
    return NextResponse.json(
      { error: 'Failed to get billing history', details: error.message },
      { status: 500 }
    );
  }
}

