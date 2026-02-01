import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, billingRuns } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { successResponse, unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized billing history access');
      return unauthorized();
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'admin') {
      logger.security.warn('Non-admin attempted to access billing history', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Admin access required');
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

    logger.admin.info('Billing history fetched', {
      requestedBy: dbUser.email,
      runsCount: runs.length,
      limit,
      offset
    });

    return successResponse({
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
      }
    });
  } catch (error: any) {
    logger.api.error('Error fetching billing history', error);
    return internalError();
  }
}

