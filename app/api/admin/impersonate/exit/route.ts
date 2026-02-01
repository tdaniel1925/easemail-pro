import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, userAuditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, badRequest, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/impersonate/exit (CSRF Protected)
 *
 * Exit impersonation mode and restore admin session
 */
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { adminUserId } = body;

    if (!adminUserId) {
      logger.security.warn('Exit impersonation missing admin user ID');
      return badRequest('Missing admin user ID');
    }

    logger.security.info('Exiting impersonation', { adminUserId });

    // Get admin user details
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, adminUserId),
    });

    if (!adminUser || adminUser.role !== 'platform_admin') {
      logger.security.warn('Invalid admin user attempting to exit impersonation', {
        adminUserId,
        role: adminUser?.role
      });
      return forbidden('Invalid admin user');
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

    logger.security.info('Impersonation exit logged', {
      adminUserId,
      adminEmail: adminUser.email
    });

    return successResponse({ exited: true }, 'Exited impersonation mode');
  } catch (error) {
    logger.api.error('Exit impersonation error', error);
    return internalError();
  }
});
