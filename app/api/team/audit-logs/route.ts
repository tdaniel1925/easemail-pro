
export const dynamic = 'force-dynamic';
/**
 * Audit Logs API
 * GET /api/team/audit-logs - List audit logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/permissions';
import { db } from '@/lib/db/drizzle';
import { auditLogs } from '@/lib/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const context = await requireAuth();
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const days = parseInt(searchParams.get('days') || '30');

    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let conditions = [
      context.organizationId
        ? eq(auditLogs.organizationId, context.organizationId)
        : eq(auditLogs.userId, context.userId),
      gte(auditLogs.createdAt, sinceDate),
    ];

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    if (userId && context.isOrgAdmin) {
      conditions.push(eq(auditLogs.userId, userId));
    }

    const logs = await db.query.auditLogs.findMany({
      where: and(...conditions),
      orderBy: [desc(auditLogs.createdAt)],
      limit,
    });

    return NextResponse.json({
      success: true,
      logs,
      total: logs.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch audit logs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

