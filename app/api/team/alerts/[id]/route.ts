/**
 * Usage Alert Detail API
 * PATCH /api/team/alerts/[id] - Update alert
 * DELETE /api/team/alerts/[id] - Delete alert
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/permissions';
import { db } from '@/lib/db/drizzle';
import { usageAlerts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireAuth();
    const alertId = params.id;
    const body = await request.json();

    // Verify ownership
    const alert = await db.query.usageAlerts.findFirst({
      where: eq(usageAlerts.id, alertId),
    });

    if (!alert) {
      return NextResponse.json(
        { success: false, error: 'Alert not found' },
        { status: 404 }
      );
    }

    if (
      (alert.organizationId && alert.organizationId !== context.organizationId) ||
      (alert.userId && alert.userId !== context.userId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const [updatedAlert] = await db
      .update(usageAlerts)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(usageAlerts.id, alertId))
      .returning();

    return NextResponse.json({
      success: true,
      alert: updatedAlert,
    });
  } catch (error: any) {
    console.error('Failed to update alert:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireAuth();
    const alertId = params.id;

    // Verify ownership
    const alert = await db.query.usageAlerts.findFirst({
      where: eq(usageAlerts.id, alertId),
    });

    if (!alert) {
      return NextResponse.json(
        { success: false, error: 'Alert not found' },
        { status: 404 }
      );
    }

    if (
      (alert.organizationId && alert.organizationId !== context.organizationId) ||
      (alert.userId && alert.userId !== context.userId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await db
      .update(usageAlerts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(usageAlerts.id, alertId));

    return NextResponse.json({
      success: true,
      message: 'Alert deleted',
    });
  } catch (error: any) {
    console.error('Failed to delete alert:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

