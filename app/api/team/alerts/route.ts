/**
 * Usage Alerts API
 * GET /api/team/alerts - List usage alerts
 * POST /api/team/alerts - Create alert
 * PATCH /api/team/alerts/[id] - Update alert
 * DELETE /api/team/alerts/[id] - Delete alert
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/permissions';
import { db } from '@/lib/db/drizzle';
import { usageAlerts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const context = await requireAuth();
    
    const alerts = await db.query.usageAlerts.findMany({
      where: and(
        context.organizationId
          ? eq(usageAlerts.organizationId, context.organizationId)
          : eq(usageAlerts.userId, context.userId),
        eq(usageAlerts.isActive, true)
      ),
      orderBy: (alert, { desc }) => [desc(alert.createdAt)],
    });

    return NextResponse.json({
      success: true,
      alerts,
    });
  } catch (error: any) {
    console.error('Failed to fetch alerts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireAuth();
    const body = await request.json();
    
    const {
      alertType,
      threshold,
      notifyEmail,
      notifyInApp = true,
    } = body;

    if (!alertType || threshold === undefined) {
      return NextResponse.json(
        { success: false, error: 'alertType and threshold are required' },
        { status: 400 }
      );
    }

    const [alert] = await db.insert(usageAlerts).values({
      organizationId: context.organizationId || null,
      userId: context.organizationId ? null : context.userId,
      alertType,
      thresholdValue: threshold.toString(),
      notifyEmail: notifyEmail || false,
      notifyInApp,
      isActive: true,
    }).returning();

    return NextResponse.json({
      success: true,
      alert,
    });
  } catch (error: any) {
    console.error('Failed to create alert:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

