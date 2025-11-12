import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, userAuditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/impersonate/exit
 *
 * Exit impersonation mode and restore admin session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminUserId } = body;

    if (!adminUserId) {
      return NextResponse.json({ error: 'Missing admin user ID' }, { status: 400 });
    }

    console.log(`🔙 Exiting impersonation, returning to admin: ${adminUserId}`);

    // Get admin user details
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, adminUserId),
    });

    if (!adminUser || adminUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Invalid admin user' }, { status: 403 });
    }

    // Log the exit action
    await db.insert(userAuditLogs).values({
      userId: adminUserId,
      action: 'exited_impersonation',
      performedBy: adminUserId,
      details: {
        exitedAt: new Date().toISOString(),
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    console.log(`✅ Impersonation exit logged`);

    return NextResponse.json({
      success: true,
      message: 'Exited impersonation mode',
    });
  } catch (error) {
    console.error('❌ Exit impersonation error:', error);
    return NextResponse.json({
      error: 'Failed to exit impersonation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
