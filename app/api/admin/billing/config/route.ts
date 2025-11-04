import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { 
  billingConfig as billingConfigSchema 
} from '@/lib/db/schema';
import { 
  getBillingConfig, 
  updateBillingConfig, 
  BillingConfig 
} from '@/lib/billing/automated-billing';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/billing/config
 * 
 * Get current billing configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const config = await getBillingConfig();

    return NextResponse.json({
      success: true,
      config: config || {
        enabled: false,
        frequency: 'monthly',
        dayOfMonth: 1,
        hourOfDay: 2,
        autoRetry: true,
        maxRetries: 3,
        retryDelayHours: 24,
        notifyOnSuccess: false,
        notifyOnFailure: true,
        smsChargeThresholdUsd: 1.00,
        aiChargeThresholdUsd: 5.00,
        minimumChargeUsd: 0.50,
        gracePeriodDays: 3,
      },
    });
  } catch (error: any) {
    console.error('Get billing config API error:', error);
    return NextResponse.json(
      { error: 'Failed to get billing configuration', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/billing/config
 * 
 * Update billing configuration
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields
    const config: Partial<BillingConfig> = {
      enabled: body.enabled,
      frequency: body.frequency,
      dayOfWeek: body.dayOfWeek,
      dayOfMonth: body.dayOfMonth,
      hourOfDay: body.hourOfDay,
      autoRetry: body.autoRetry,
      maxRetries: body.maxRetries,
      retryDelayHours: body.retryDelayHours,
      notifyOnSuccess: body.notifyOnSuccess,
      notifyOnFailure: body.notifyOnFailure,
      notificationEmail: body.notificationEmail,
      smsChargeThresholdUsd: body.smsChargeThresholdUsd,
      aiChargeThresholdUsd: body.aiChargeThresholdUsd,
      minimumChargeUsd: body.minimumChargeUsd,
      gracePeriodDays: body.gracePeriodDays,
    };

    await updateBillingConfig(config);

    return NextResponse.json({
      success: true,
      message: 'Billing configuration updated successfully',
      config,
    });
  } catch (error: any) {
    console.error('Update billing config API error:', error);
    return NextResponse.json(
      { error: 'Failed to update billing configuration', details: error.message },
      { status: 500 }
    );
  }
}

