import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizations, organizationMembers, userAuditLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateSecurePassword, hashPassword, generatePasswordExpiry } from '@/lib/auth/password-utils';
import { sendEmail } from '@/lib/email/send';
import { getNewUserCredentialsTemplate, getNewUserCredentialsSubject } from '@/lib/email/templates/new-user-credentials';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, notFound, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

/**
 * POST /api/admin/organizations/[orgId]/users
 * Create a new user for an organization (CSRF Protected)
 * Accessible by: Platform admins and organization admins (for their own org)
 */
export const POST = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    const { orgId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized organization user creation attempt');
      return unauthorized();
    }

    // Get current user from database
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!currentUser) {
      logger.admin.warn('Current user not found in database', { userId: user.id });
      return notFound('User not found');
    }

    // Get target organization
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!organization) {
      logger.admin.warn('Organization not found', {
        orgId,
        requestedBy: currentUser.email
      });
      return notFound('Organization not found');
    }

    // Authorization check: Platform admin OR org admin of this specific org
    const isPlatformAdmin = currentUser.role === 'platform_admin';
    const isOrgAdmin = currentUser.role === 'org_admin' && currentUser.organizationId === orgId;

    if (!isPlatformAdmin && !isOrgAdmin) {
      logger.security.warn('Unauthorized organization user creation attempt', {
        userId: user.id,
        email: user.email,
        role: currentUser.role,
        orgId,
        orgName: organization.name
      });
      return forbidden('You do not have permission to add users to this organization');
    }

    // Parse request body
    const body = await request.json();
    const { email, fullName, role = 'member' } = body;

    // Validation
    if (!email || !fullName) {
      logger.admin.warn('Missing required fields for user creation', {
        hasEmail: !!email,
        hasFullName: !!fullName,
        requestedBy: currentUser.email
      });
      return badRequest('Email and full name are required');
    }

    if (!['admin', 'member'].includes(role)) {
      logger.admin.warn('Invalid role specified', {
        role,
        requestedBy: currentUser.email
      });
      return badRequest('Invalid role. Must be "admin" or "member"');
    }

    // Check if email is already in use
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (existingUser) {
      logger.admin.warn('Attempted to create user with existing email', {
        email: email.toLowerCase().trim(),
        requestedBy: currentUser.email
      });
      return badRequest('A user with this email address already exists');
    }

    // Check seat limit
    const orgMembers = await db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.isActive, true)
      ),
    });

    if (organization.maxSeats && orgMembers.length >= organization.maxSeats) {
      logger.admin.warn('Organization at maximum capacity', {
        orgId,
        orgName: organization.name,
        currentSeats: orgMembers.length,
        maxSeats: organization.maxSeats,
        requestedBy: currentUser.email
      });
      return badRequest(`Organization is at maximum capacity (${orgMembers.length}/${organization.maxSeats} seats). Please upgrade plan or remove inactive users.`);
    }

    // Check if user exists in Supabase Auth (to prevent duplicate auth users)
    const adminClient = await createAdminClient();
    const { data: existingAuthUsers } = await adminClient.auth.admin.listUsers();
    const authUserExists = existingAuthUsers?.users?.some(
      u => u.email?.toLowerCase() === email.toLowerCase().trim()
    );

    let authUserId: string;
    let tempPassword: string;

    if (authUserExists) {
      // User exists in auth but not in our DB - get their ID and reset password
      const existingAuthUser = existingAuthUsers?.users?.find(
        u => u.email?.toLowerCase() === email.toLowerCase().trim()
      );
      authUserId = existingAuthUser!.id;
      tempPassword = generateSecurePassword(16);

      logger.admin.info('Reusing existing Supabase Auth user', {
        authUserId,
        email: email.toLowerCase().trim(),
        requestedBy: currentUser.email
      });

      // Update their password
      await adminClient.auth.admin.updateUserById(authUserId, {
        password: tempPassword,
        user_metadata: {
          full_name: fullName,
        },
      });
    } else {
      // Create new auth user
      tempPassword = generateSecurePassword(16);

      logger.admin.info('Generating new auth user', {
        email: email.toLowerCase().trim(),
        requestedBy: currentUser.email
      });

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: tempPassword,
        email_confirm: true, // Skip email verification for admin-created users
        user_metadata: {
          full_name: fullName,
        },
      });

      if (authError || !authData.user) {
        logger.api.error('Failed to create Supabase Auth user', {
          error: authError,
          email: email.toLowerCase().trim(),
          requestedBy: currentUser.email
        });
        return internalError('Failed to create user account');
      }

      authUserId = authData.user.id;
      logger.admin.info('Created Supabase Auth user', {
        authUserId,
        email: email.toLowerCase().trim(),
        requestedBy: currentUser.email
      });
    }

    const hashedTempPassword = await hashPassword(tempPassword);
    const tempPasswordExpiry = generatePasswordExpiry();

    // Create user in database (use upsert to handle race conditions)
    const [newUser] = await db.insert(users).values({
      id: authUserId,
      email: email.toLowerCase().trim(),
      fullName,
      organizationId: orgId,
      role: role === 'admin' ? 'org_admin' : 'org_user',
      accountStatus: 'pending', // User hasn't logged in yet
      tempPassword: hashedTempPassword,
      requirePasswordChange: true,
      tempPasswordExpiresAt: tempPasswordExpiry,
      createdBy: currentUser.id,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: email.toLowerCase().trim(),
        fullName,
        organizationId: orgId,
        role: role === 'admin' ? 'org_admin' : 'org_user',
        accountStatus: 'pending',
        tempPassword: hashedTempPassword,
        requirePasswordChange: true,
        tempPasswordExpiresAt: tempPasswordExpiry,
        updatedAt: new Date(),
      },
    })
    .returning();

    logger.admin.info('Created/updated database user record', {
      userId: newUser.id,
      email: newUser.email,
      orgId,
      requestedBy: currentUser.email
    });

    // Add user to organization members
    await db.insert(organizationMembers).values({
      organizationId: orgId,
      userId: newUser.id,
      role: role,
      joinedAt: new Date(),
      isActive: true,
    });

    // Update organization seat count
    await db.update(organizations)
      .set({
        currentSeats: orgMembers.length + 1,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId));

    logger.admin.info('Added user to organization members', {
      userId: newUser.id,
      orgId,
      orgName: organization.name,
      role,
      requestedBy: currentUser.email
    });

    // Log audit event
    await db.insert(userAuditLogs).values({
      userId: newUser.id,
      action: 'created',
      performedBy: currentUser.id,
      details: {
        organizationId: orgId,
        organizationName: organization.name,
        role: role,
        createdVia: 'admin_panel',
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    logger.admin.info('Logged audit event for new user', {
      userId: newUser.id,
      action: 'created',
      performedBy: currentUser.email
    });

    // Send credentials email
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;
    
    const emailData = {
      recipientName: fullName,
      recipientEmail: email,
      organizationName: organization.name,
      tempPassword: tempPassword, // Send plain text password in email (only time it's exposed)
      loginUrl: loginUrl,
      expiryDays: 7,
      adminName: currentUser.fullName || currentUser.email,
    };

    const emailResult = await sendEmail({
      to: email,
      subject: getNewUserCredentialsSubject(emailData),
      html: getNewUserCredentialsTemplate(emailData),
    });

    if (!emailResult.success) {
      logger.api.error('Failed to send credentials email', {
        error: emailResult.error,
        email,
        requestedBy: currentUser.email
      });
      // Don't fail the request - user was created successfully
      // Admin can resend credentials later
    } else {
      logger.admin.info('Credentials email sent successfully', {
        email,
        userId: newUser.id,
        requestedBy: currentUser.email
      });
    }

    logger.admin.info('Organization user creation complete', {
      userId: newUser.id,
      email: newUser.email,
      orgId,
      orgName: organization.name,
      role,
      emailSent: emailResult.success,
      createdBy: currentUser.email
    });

    return successResponse({
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: role,
        accountStatus: newUser.accountStatus,
        tempPasswordExpiresAt: newUser.tempPasswordExpiresAt,
      },
      emailSent: emailResult.success,
    }, `User created successfully and credentials sent to ${email}`);

  } catch (error: any) {
    logger.api.error('Error creating organization user', error);
    return internalError();
  }
});

