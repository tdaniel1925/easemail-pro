import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, userActivityLogs } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET: Fetch user activity logs with filters
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    const { userId } = params;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const activityType = searchParams.get('activityType');
    const status = searchParams.get('status');
    const isFlagged = searchParams.get('isFlagged');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query conditions
    const conditions = [eq(userActivityLogs.userId, userId)];

    if (activityType) {
      conditions.push(eq(userActivityLogs.activityType, activityType));
    }

    if (status) {
      conditions.push(eq(userActivityLogs.status, status));
    }

    if (isFlagged === 'true') {
      conditions.push(eq(userActivityLogs.isFlagged, true));
    }

    if (startDate) {
      conditions.push(gte(userActivityLogs.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(userActivityLogs.createdAt, new Date(endDate)));
    }

    // Fetch activities
    const activities = await db
      .select()
      .from(userActivityLogs)
      .where(and(...conditions))
      .orderBy(desc(userActivityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userActivityLogs)
      .where(and(...conditions));

    // Get activity type summary
    const typeSummary = await db
      .select({
        activityType: userActivityLogs.activityType,
        count: sql<number>`count(*)::int`,
      })
      .from(userActivityLogs)
      .where(eq(userActivityLogs.userId, userId))
      .groupBy(userActivityLogs.activityType);

    // Get error summary
    const errorSummary = await db
      .select({
        status: userActivityLogs.status,
        count: sql<number>`count(*)::int`,
      })
      .from(userActivityLogs)
      .where(eq(userActivityLogs.userId, userId))
      .groupBy(userActivityLogs.status);

    return NextResponse.json({
      success: true,
      activities,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + activities.length < count,
      },
      summary: {
        byType: typeSummary,
        byStatus: errorSummary,
      },
    });
  } catch (error) {
    console.error('Activity logs fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}

// POST: Log a new activity
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    const body = await request.json();

    const {
      activityType,
      activityName,
      path,
      method,
      status = 'success',
      errorMessage,
      errorStack,
      metadata,
      duration,
      ipAddress,
      userAgent,
      browser,
      os,
      device,
    } = body;

    if (!activityType || !activityName) {
      return NextResponse.json(
        { error: 'activityType and activityName are required' },
        { status: 400 }
      );
    }

    // Create activity log
    const [activity] = await db.insert(userActivityLogs).values({
      userId,
      activityType,
      activityName,
      path,
      method,
      status,
      errorMessage,
      errorStack,
      isFlagged: status === 'error', // Auto-flag errors
      metadata,
      duration,
      ipAddress,
      userAgent,
      browser,
      os,
      device,
    }).returning();

    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error('Activity log creation error:', error);
    return NextResponse.json({ error: 'Failed to create activity log' }, { status: 500 });
  }
}
