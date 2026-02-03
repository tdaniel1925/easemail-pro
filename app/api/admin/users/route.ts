import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, emailAccounts, userAuditLogs } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/send';
import {
  getInvitationEmailTemplate,
  getInvitationEmailSubject,
  generateInvitationToken,
  generateInvitationExpiry
} from '@/lib/email/templates/invitation-email';
import { withCsrfProtection } from '@/lib/security/csrf';
import { checkRateLimit } from '@/lib/middleware/rate-limit';
import { successResponse, unauthorized, forbidden, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

// GET: List all users (admin only)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized users list access');
      return unauthorized();
    }

    // Check rate limit (5 requests per minute)
    const rateLimitResult = await checkRateLimit('admin', `user:${user.id}`);
    if (!rateLimitResult.allowed) {
      logger.security.warn('Admin rate limit exceeded', {
        userId: user.id,
        endpoint: '/api/admin/users',
      });
      return rateLimitResult.response!;
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to list users', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
      });
      return forbidden('Platform admin access required');
    }

    // Fetch all users with email account counts
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        subscriptionTier: users.subscriptionTier,
        isPromoUser: users.isPromoUser,
        suspended: users.suspended,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        emailAccountCount: sql<number>`count(${emailAccounts.id})::int`,
      })
      .from(users)
      .leftJoin(emailAccounts, eq(users.id, emailAccounts.userId))
      .groupBy(users.id)
      .orderBy(users.createdAt);

    // Transform to include _count and map beta users
    const usersWithCounts = allUsers.map(u => ({
      ...u,
      // Display 'beta' tier if isPromoUser is true, otherwise show actual tier
      subscriptionTier: u.isPromoUser ? 'beta' : u.subscriptionTier,
      _count: {
        emailAccounts: u.emailAccountCount,
      },
    }));

    logger.admin.info('Users list fetched', {
      requestedBy: dbUser.email,
      userCount: usersWithCounts.length
    });

    return successResponse({ users: usersWithCounts });
  } catch (error) {
    logger.api.error('Admin users fetch error', error);
    return internalError();
  }
}

// POST: Create a new user (platform admin only - CSRF Protected)
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized user creation attempt');
      return unauthorized();
    }

    // Check rate limit (5 requests per minute)
    const rateLimitResult = await checkRateLimit('admin', `user:${user.id}`);
    if (!rateLimitResult.allowed) {
      logger.security.warn('Admin rate limit exceeded', {
        userId: user.id,
        endpoint: '/api/admin/users',
      });
      return rateLimitResult.response!;
    }

    // Get current user from database
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!currentUser || currentUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to create user', {
        userId: user.id,
        email: user.email,
        role: currentUser?.role,
      });
      return forbidden('Platform admin access required');
    }

    // Parse request body
    const body = await request.json();
    const {
      email,
      fullName,
      role = 'individual',
      organizationId,
      password, // Optional - if not provided, use invitation flow
      subscriptionTier = 'free' // Default to free tier
    } = body;

    // Validation
    if (!email || !fullName) {
      logger.admin.warn('Missing required fields for user creation', { requestedBy: currentUser.email });
      return badRequest('Email and full name are required');
    }

    const validRoles = ['platform_admin', 'org_admin', 'org_user', 'individual'];
    if (!validRoles.includes(role)) {
      logger.admin.warn('Invalid role provided', { role, requestedBy: currentUser.email });
      return badRequest(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    const validTiers = ['free', 'starter', 'pro', 'enterprise', 'beta'];
    if (!validTiers.includes(subscriptionTier)) {
      logger.admin.warn('Invalid subscription tier', { tier: subscriptionTier, requestedBy: currentUser.email });
      return badRequest(`Invalid subscription tier. Must be one of: ${validTiers.join(', ')}`);
    }

    // If password is provided, validate it
    if (password && password.length < 8) {
      logger.admin.warn('Password too short', { requestedBy: currentUser.email });
      return badRequest('Password must be at least 8 characters long');
    }

    // Check if email is already in use
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (existingUser) {
      logger.admin.warn('Attempted to create duplicate user', {
        email,
        requestedBy: currentUser.email
      });
      return badRequest('A user with this email address already exists');
    }

    // Check if user exists in Supabase Auth (to prevent duplicate auth users)
    const adminClient = await createAdminClient();
    const { data: existingAuthUsers } = await adminClient.auth.admin.listUsers();
    const authUserExists = existingAuthUsers?.users?.some(
      u => u.email?.toLowerCase() === email.toLowerCase().trim()
    );

    let authUserId: string;
    const useInvitationFlow = !password; // Use invitation if no password provided
    const invitationToken = useInvitationFlow ? generateInvitationToken() : null;
    const invitationExpiry = useInvitationFlow ? generateInvitationExpiry(7) : null; // 7 days

    if (authUserExists) {
      // User exists in auth but not in our DB - get their ID
      const existingAuthUser = existingAuthUsers?.users?.find(
        u => u.email?.toLowerCase() === email.toLowerCase().trim()
      );
      authUserId = existingAuthUser!.id;

      logger.admin.info('Reusing existing Supabase Auth user', {
        authUserId,
        email,
        createdBy: currentUser.email
      });

      // Update their metadata and password if provided
      const updateData: any = {
        user_metadata: {
          full_name: fullName,
        },
        email_confirm: !useInvitationFlow, // Auto-confirm if password provided
      };

      if (password) {
        updateData.password = password;
      }

      await adminClient.auth.admin.updateUserById(authUserId, updateData);
    } else {
      // Create new auth user
      const userPassword = password || Math.random().toString(36).slice(-32); // Use provided or random password

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: userPassword,
        email_confirm: !useInvitationFlow, // Auto-confirm if password provided
        user_metadata: {
          full_name: fullName,
        },
      });

      if (authError || !authData.user) {
        logger.auth.error('Supabase Auth user creation failed', {
          error: authError,
          email,
          createdBy: currentUser.email
        });
        return internalError();
      }

      authUserId = authData.user.id;
      logger.auth.info('Created Supabase Auth user', {
        authUserId,
        email,
        createdBy: currentUser.email
      });
    }

    // Create user in database
    const userValues: any = {
      id: authUserId,
      email: email.toLowerCase().trim(),
      fullName,
      organizationId: organizationId || null,
      role: role,
      subscriptionTier: subscriptionTier,
      isPromoUser: subscriptionTier === 'beta', // Beta users are promo users
      accountStatus: useInvitationFlow ? 'pending' : 'active', // Active if password provided
      invitedBy: currentUser.id,
      createdBy: currentUser.id,
    };

    // Add invitation fields only if using invitation flow
    if (useInvitationFlow) {
      userValues.invitationToken = invitationToken;
      userValues.invitationExpiresAt = invitationExpiry;
    }

    const [newUser] = await db.insert(users).values(userValues)
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: email.toLowerCase().trim(),
        fullName,
        organizationId: organizationId || null,
        role: role,
        subscriptionTier: subscriptionTier,
        isPromoUser: subscriptionTier === 'beta',
        accountStatus: useInvitationFlow ? 'pending' : 'active',
        invitedBy: currentUser.id,
        updatedAt: new Date(),
        ...(useInvitationFlow ? {
          invitationToken: invitationToken,
          invitationExpiresAt: invitationExpiry,
        } : {}),
      },
    })
    .returning();

    logger.db.info('Created/updated database user record', {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      createdBy: currentUser.email
    });

    // Log audit event
    await db.insert(userAuditLogs).values({
      userId: newUser.id,
      action: 'created',
      performedBy: currentUser.id,
      details: {
        role: role,
        organizationId: organizationId || null,
        createdVia: 'admin_panel',
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    logger.admin.info('User creation audit event logged', {
      userId: newUser.id,
      createdBy: currentUser.email
    });

    // Send invitation email only if using invitation flow
    let emailResult = { success: false };
    if (useInvitationFlow) {
      const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${invitationToken}`;

      const emailData = {
        recipientName: fullName,
        recipientEmail: email,
        invitationUrl: invitationUrl,
        inviterName: currentUser.fullName || currentUser.email,
        expiryDays: 7,
      };

      emailResult = await sendEmail({
        to: email,
        subject: getInvitationEmailSubject(emailData),
        html: getInvitationEmailTemplate(emailData),
      });

      if (!emailResult.success) {
        logger.email.error('Failed to send invitation email', {
          email,
          userId: newUser.id
        });
        // Don't fail the request - user was created successfully
      } else {
        logger.email.info('Invitation email sent', {
          email,
          userId: newUser.id
        });
      }
    }

    const responseMessage = useInvitationFlow
      ? `User created successfully. Invitation email sent to ${email}`
      : `User created successfully with password. User can login immediately.`;

    logger.admin.info('User created successfully', {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      useInvitationFlow,
      createdBy: currentUser.email
    });

    return successResponse({
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        subscriptionTier: newUser.subscriptionTier,
        accountStatus: newUser.accountStatus,
      },
      emailSent: emailResult.success,
      requiresInvitation: useInvitationFlow,
    }, responseMessage);

  } catch (error: any) {
    logger.api.error('Error creating user', error);
    return internalError();
  }
});

