import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, subscriptions, organizations } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/subscription
 * Get current user's subscription details
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get subscription (either user's individual or org subscription)
    const subscription = await db.query.subscriptions.findFirst({
      where: or(
        eq(subscriptions.userId, user.id),
        dbUser.organizationId ? eq(subscriptions.organizationId, dbUser.organizationId) : undefined
      ),
      orderBy: (subscriptions, { desc }) => [desc(subscriptions.createdAt)],
    });

    if (!subscription) {
      return NextResponse.json({
        success: false,
        subscription: null,
      });
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        planId: subscription.planId,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        seats: subscription.seats,
        billingCycle: subscription.billingCycle,
        trialEnd: subscription.trialEnd,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
