/**
 * Sync Health API Endpoint
 *
 * Provides health monitoring data for the email sync system.
 * Used by admin dashboards and monitoring tools.
 *
 * GET /api/sync/health - Get system-wide health
 * GET /api/sync/health?accountId=xxx - Get specific account health
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  checkAccountHealth,
  checkSystemHealth,
  getUnhealthyAccounts,
  getHealthHistory,
  recordHealthHistory,
} from '@/lib/sync/health-monitor';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = request.nextUrl.searchParams.get('accountId');
    const includeHistory = request.nextUrl.searchParams.get('history') === 'true';
    const includeUnhealthy = request.nextUrl.searchParams.get('unhealthy') === 'true';

    // Check if user is admin (for system-wide view)
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true },
    });

    const isAdmin = dbUser?.role === 'platform_admin' || dbUser?.role === 'org_admin';

    // Specific account health check
    if (accountId) {
      const health = await checkAccountHealth(accountId);

      return NextResponse.json({
        success: true,
        health,
      });
    }

    // System-wide health check
    // Non-admins only see their own accounts
    const systemHealth = await checkSystemHealth(isAdmin ? undefined : user.id);

    // Record to history for trending
    await recordHealthHistory(systemHealth);

    const response: any = {
      success: true,
      health: systemHealth,
    };

    // Include unhealthy accounts list if requested
    if (includeUnhealthy) {
      response.unhealthyAccounts = await getUnhealthyAccounts(isAdmin ? undefined : user.id);
    }

    // Include history for trending if requested
    if (includeHistory) {
      response.history = await getHealthHistory();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[SyncHealth] Error:', error);
    return NextResponse.json({
      error: 'Failed to get health status',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
