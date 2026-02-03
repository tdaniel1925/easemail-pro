/**
 * Current Usage API
 * GET /api/billing/usage/current - Get current billing period usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUsageSummary, getOrganizationUsageSummary } from '@/lib/billing/track-usage';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/usage/current
 * Get usage summary for current billing period
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user details to check organization
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get current billing period (start of month to end of month)
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get usage summary based on whether user is in organization
    let usageSummary;
    if (dbUser.organizationId) {
      usageSummary = await getOrganizationUsageSummary(
        dbUser.organizationId,
        billingPeriodStart,
        billingPeriodEnd
      );
    } else {
      usageSummary = await getUsageSummary(
        user.id,
        billingPeriodStart,
        billingPeriodEnd
      );
    }

    logger.payment.info('Usage retrieved', {
      userId: user.id,
      organizationId: dbUser.organizationId || null,
      totalCost: usageSummary.total,
    });

    return NextResponse.json({
      period: {
        start: billingPeriodStart.toISOString(),
        end: billingPeriodEnd.toISOString(),
      },
      usage: {
        sms: {
          count: usageSummary.sms.quantity,
          cost: usageSummary.sms.cost,
          formatted: `$${usageSummary.sms.cost.toFixed(2)}`,
        },
        ai: {
          tokens: usageSummary.ai.quantity,
          cost: usageSummary.ai.cost,
          formatted: `$${usageSummary.ai.cost.toFixed(2)}`,
        },
        storage: {
          gb: usageSummary.storage.quantity,
          cost: usageSummary.storage.cost,
          formatted: `$${usageSummary.storage.cost.toFixed(2)}`,
        },
        email: {
          count: usageSummary.email.quantity,
          cost: usageSummary.email.cost,
          formatted: `$${usageSummary.email.cost.toFixed(2)}`,
        },
      },
      total: {
        cost: usageSummary.total,
        formatted: `$${usageSummary.total.toFixed(2)}`,
      },
      organizationId: dbUser.organizationId || null,
    });
  } catch (error) {
    logger.payment.error('Failed to get usage', error);
    return NextResponse.json(
      { error: 'Failed to retrieve usage data' },
      { status: 500 }
    );
  }
}
