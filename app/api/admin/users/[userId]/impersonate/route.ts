import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, userAuditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { checkRateLimit } from '@/lib/middleware/rate-limit';
import { successResponse, unauthorized, forbidden, badRequest, notFound, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ userId: string }>;
};

/**
 * POST /api/admin/users/[userId]/impersonate (CSRF Protected)
 *
 * Allow platform admins to impersonate (log in as) another user for troubleshooting.
 * This creates a temporary session for the target user and logs the impersonation.
 */
export const POST = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    const { userId: targetUserId } = await context.params;
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
      logger.security.warn('Unauthorized impersonation attempt');
      return unauthorized();
    }

    // Check rate limit (2 requests per minute - very strict for impersonation)
    const rateLimitResult = await checkRateLimit('impersonate', `user:${adminUser.id}`);
    if (!rateLimitResult.allowed) {
      logger.security.warn('Impersonation rate limit exceeded', {
        userId: adminUser.id,
        targetUserId,
        endpoint: '/api/admin/users/[userId]/impersonate',
      });
      return rateLimitResult.response!;
    }

    // Check if requesting user is platform admin
    const dbAdmin = await db.query.users.findFirst({
      where: eq(users.id, adminUser.id),
    });

    if (!dbAdmin || dbAdmin.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted impersonation', {
        userId: adminUser.id,
        email: adminUser.email,
        role: dbAdmin?.role,
        targetUserId
      });
      return forbidden('Platform admin access required');
    }

    // Prevent self-impersonation (no real benefit, could cause confusion)
    if (targetUserId === adminUser.id) {
      logger.security.warn('Admin attempted self-impersonation', {
        adminEmail: dbAdmin.email,
        adminId: adminUser.id
      });
      return badRequest('Cannot impersonate yourself');
    }

    // Get target user details
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!targetUser) {
      logger.security.warn('Impersonation target user not found', {
        adminEmail: dbAdmin.email,
        targetUserId
      });
      return notFound('Target user not found');
    }

    // Check if target user is suspended
    if (targetUser.suspended) {
      logger.security.warn('Attempted to impersonate suspended user', {
        adminEmail: dbAdmin.email,
        targetUserId,
        targetEmail: targetUser.email
      });
      return badRequest('Cannot impersonate suspended user');
    }

    logger.security.info('Starting user impersonation', {
      adminEmail: dbAdmin.email,
      adminId: adminUser.id,
      targetEmail: targetUser.email,
      targetUserId
    });

    // Create impersonation session using Supabase Admin Client
    const adminClient = await createAdminClient();

    // Generate a magic link and extract the OTP token
    logger.auth.debug('Generating OTP for impersonation', {
      targetUserId,
      targetEmail: targetUser.email,
      adminEmail: dbAdmin.email
    });

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email,
    });

    if (linkError || !linkData) {
      logger.auth.error('Failed to generate impersonation link', {
        error: linkError,
        targetUserId,
        adminEmail: dbAdmin.email
      });
      return internalError();
    }

    // Extract the OTP from the generated link
    const emailOtp = linkData.properties.email_otp;

    if (!emailOtp) {
      logger.auth.error('No OTP in impersonation response', {
        targetUserId,
        adminEmail: dbAdmin.email
      });
      return internalError();
    }

    // Verify the OTP using the regular client to get a session
    const regularClient = await createClient();
    const { data: verifyData, error: verifyError } = await regularClient.auth.verifyOtp({
      email: targetUser.email,
      token: emailOtp,
      type: 'email',
    });

    if (verifyError || !verifyData?.session) {
      logger.auth.error('Failed to verify impersonation OTP', {
        error: verifyError,
        targetUserId,
        adminEmail: dbAdmin.email
      });
      return internalError();
    }

    const accessToken = verifyData.session?.access_token;
    const refreshToken = verifyData.session?.refresh_token;

    logger.auth.info('Impersonation session created successfully', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      targetUserId,
      adminEmail: dbAdmin.email
    });

    // Log the impersonation action in audit logs
    await db.insert(userAuditLogs).values({
      userId: adminUser.id, // Admin who performed the impersonation
      action: 'impersonated_user',
      performedBy: adminUser.id,
      details: {
        targetUserId: targetUserId,
        targetUserEmail: targetUser.email,
        targetUserRole: targetUser.role,
        reason: 'troubleshooting',
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // Also log from target user's perspective
    await db.insert(userAuditLogs).values({
      userId: targetUserId, // User being impersonated
      action: 'was_impersonated',
      performedBy: adminUser.id,
      details: {
        adminUserId: adminUser.id,
        adminUserEmail: dbAdmin.email,
        reason: 'troubleshooting',
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    logger.security.info('Impersonation completed successfully', {
      adminId: adminUser.id,
      adminEmail: dbAdmin.email,
      targetUserId,
      targetEmail: targetUser.email
    });

    // Create response with impersonation metadata
    return successResponse({
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
      user: {
        id: targetUser.id,
        email: targetUser.email,
        fullName: targetUser.fullName,
        role: targetUser.role,
      },
      impersonation: {
        adminUserId: adminUser.id,
        adminEmail: dbAdmin.email,
        targetUserId: targetUserId,
        targetEmail: targetUser.email,
        startedAt: new Date().toISOString(),
      },
    }, 'Impersonation session created');
  } catch (error) {
    logger.api.error('User impersonation error', error);
    return internalError();
  }
});
