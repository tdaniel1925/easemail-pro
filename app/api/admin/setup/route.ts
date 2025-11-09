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
      console.warn('⚠️ Admin setup attempted but platform admin already exists');
      return NextResponse.json({
        error: 'Setup already completed. Platform admin already exists.',
        hint: 'If you need to add additional admins, please use the admin panel.',
      }, { status: 403 });
    }

    // 3. Verify setup token
    const { email, setupToken } = await request.json();

    const expectedToken = process.env.ADMIN_SETUP_TOKEN;
    if (!expectedToken) {
      console.error('❌ ADMIN_SETUP_TOKEN not configured in environment');
      return NextResponse.json({
        error: 'Admin setup is not properly configured',
        hint: 'Please set ADMIN_SETUP_TOKEN in environment variables',
      }, { status: 500 });
    }

    if (!setupToken || setupToken !== expectedToken) {
      console.warn('⚠️ Invalid setup token provided');
      return NextResponse.json({
        error: 'Invalid setup token',
      }, { status: 403 });
    }

    // 4. Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({
        error: 'Valid email is required'
      }, { status: 400 });
    }

    // 5. Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (!user) {
      return NextResponse.json({
        error: 'User not found. Please create an account first.'
      }, { status: 404 });
    }

    // 6. Update user role to platform_admin
    await db.update(users)
      .set({
        role: 'platform_admin',
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    console.log(`✅ Platform admin created: ${email} (${user.id})`);

    return NextResponse.json({
      success: true,
      message: `User ${email} is now a platform admin`,
      userId: user.id,
    });
  } catch (error) {
    console.error('❌ Admin setup error:', error);
    return NextResponse.json({
      error: 'Failed to complete admin setup',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

