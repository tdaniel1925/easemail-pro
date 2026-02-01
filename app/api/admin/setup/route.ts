/**
 * Admin Setup Endpoint
 * POST /api/admin/setup
 *
 * SECURITY: One-time setup endpoint for creating the first platform admin
 * Requires:
 * 1. ADMIN_SETUP_TOKEN environment variable to match request token
 * 2. No existing platform_admin in the database
 * 3. Valid user email that exists in the system
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { checkPlatformAdminExists } from '@/lib/auth/admin-check';
import { authRateLimit, enforceRateLimit } from '@/lib/security/rate-limiter';
import { successResponse, badRequest, forbidden, notFound, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting - prevent brute force
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    const rateLimitResult = await enforceRateLimit(authRateLimit, `setup:${clientIp}`);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        {
          status: 429,
          headers: rateLimitResult.headers
        }
      );
    }

    // 2. Check if admin already exists
    const adminExists = await checkPlatformAdminExists();
    if (adminExists) {
      logger.security.warn('Admin setup attempted but platform admin already exists', {
        clientIp
      });
      return NextResponse.json({
        success: false,
        error: 'Setup already completed. Platform admin already exists.',
        code: 'SETUP_ALREADY_COMPLETED',
        hint: 'If you need to add additional admins, please use the admin panel.',
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    // 3. Verify setup token
    const { email, setupToken } = await request.json();

    const expectedToken = process.env.ADMIN_SETUP_TOKEN;
    if (!expectedToken) {
      logger.security.error('ADMIN_SETUP_TOKEN not configured in environment');
      return NextResponse.json({
        success: false,
        error: 'Admin setup is not properly configured',
        code: 'SETUP_NOT_CONFIGURED',
        hint: 'Please set ADMIN_SETUP_TOKEN in environment variables',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    if (!setupToken || setupToken !== expectedToken) {
      logger.security.warn('Invalid setup token provided', { clientIp });
      return forbidden('Invalid setup token');
    }

    // 4. Validate email
    if (!email || typeof email !== 'string') {
      logger.security.warn('Invalid email in setup request', { clientIp });
      return badRequest('Valid email is required');
    }

    // 5. Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (!user) {
      logger.security.warn('Setup attempted for non-existent user', {
        email,
        clientIp
      });
      return notFound('User not found. Please create an account first.');
    }

    // 6. Update user role to platform_admin
    await db.update(users)
      .set({
        role: 'platform_admin',
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    logger.security.info('Platform admin created', {
      email,
      userId: user.id,
      clientIp
    });

    return successResponse({
      userId: user.id,
      email
    }, `User ${email} is now a platform admin`);
  } catch (error) {
    logger.security.error('Admin setup error', error);
    return internalError();
  }
}

