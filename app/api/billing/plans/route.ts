/**
 * Subscription Plans API
 * GET /api/billing/plans - List available subscription plans
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { subscriptionPlans } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/plans
 * List all active subscription plans
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

    // Get all active plans, sorted by display order
    const plans = await db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.isActive, true),
      orderBy: [desc(subscriptionPlans.displayOrder)],
    });

    // Transform plans for frontend
    const transformedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      pricing: {
        monthly: Number(plan.monthlyPrice),
        yearly: plan.yearlyPrice ? Number(plan.yearlyPrice) : null,
        currency: plan.currency,
      },
      features: plan.features as string[],
      limits: plan.limits as {
        maxSeats?: number;
        maxEmails?: number;
        maxStorage?: number;
        aiRequests?: number;
        smsMessages?: number;
      },
      paypalPlanId: plan.paypalPlanId,
    }));

    logger.payment.info('Plans listed', {
      userId: user.id,
      planCount: transformedPlans.length,
    });

    return NextResponse.json({
      plans: transformedPlans,
    });
  } catch (error) {
    logger.payment.error('Failed to list plans', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription plans' },
      { status: 500 }
    );
  }
}
