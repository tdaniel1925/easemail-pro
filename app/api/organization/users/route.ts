import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizations, organizationMembers } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { sendEmail } from '@/lib/email/send';
import {
  getNewUserCredentialsTemplate,
  getNewUserCredentialsSubject,
} from '@/lib/email/templates/new-user-credentials';
import { successResponse, unauthorized, forbidden, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';
import * as bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/organization/users
 *
 * List all users in the organization (org admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return unauthorized();
    }

    // Get current user
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || !dbUser.organizationId) {
      return forbidden('You must be part of an organization');
    }

    // Check if user is org_admin, platform_admin, or user_admin
    const allowedRoles = ['org_admin', 'platform_admin', 'user_admin'];
    if (!allowedRoles.includes(dbUser.role)) {
      return forbidden('Organization admin access required');
    }

    // Fetch all users in the same organization
    const orgUsers = await db.query.users.findMany({
      where: eq(users.organizationId, dbUser.organizationId),
    });

    // Get organization member roles
    const memberRoles = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.organizationId, dbUser.organizationId),
    });

    // Combine user data with org roles
    const usersWithRoles = orgUsers.map(u => {
      const memberRole = memberRoles.find(m => m.userId === u.id);
      return {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        orgRole: memberRole?.role || 'member',
        accountStatus: u.accountStatus,
        suspended: u.suspended,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
    });

    return successResponse({ users: usersWithRoles });
  } catch (error) {
    logger.api.error('Error fetching organization users', error);
    return internalError();
  }
}

/**
 * POST /api/organization/users (CSRF Protected)
 *
 * Add a new user to the organization (org admin only)
 */
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return unauthorized();
    }

    // Get current user
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!currentUser || !currentUser.organizationId) {
      return forbidden('You must be part of an organization');
    }

    // Check if user is org_admin, platform_admin, or user_admin
    const allowedRoles = ['org_admin', 'platform_admin', 'user_admin'];
    if (!allowedRoles.includes(currentUser.role)) {
      return forbidden('Organization admin access required');
    }

    // Parse request body
    const body = await request.json();
    const { email, fullName, orgRole = 'member' } = body;

    // Validation
    if (!email || !fullName) {
      return badRequest('Email and full name are required');
    }

    const validOrgRoles = ['owner', 'admin', 'user_admin', 'member'];
    if (!validOrgRoles.includes(orgRole)) {
      return badRequest('Invalid organization role');
    }

    // user_admin cannot create owners or admins
    if (currentUser.role === 'user_admin' && (orgRole === 'owner' || orgRole === 'admin')) {
      return forbidden('User admins cannot create owners or admins');
    }

    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (existingUser) {
      return badRequest('A user with this email already exists');
    }

    // Get organization details for the email
    const organization = await db.query.organizations.findFirst({
      where: (orgs, { eq }) => eq(orgs.id, currentUser.organizationId!),
    });

    if (!organization) {
      return internalError('Organization not found');
    }

    // Check seat limit
    const memberCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.organizationId, organization.id));

    const currentMemberCount = Number(memberCountResult[0]?.count || 0);

    if (currentMemberCount >= (organization.maxSeats || 10)) {
      return badRequest(`Organization has reached maximum seats limit (${organization.maxSeats || 10})`);
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + '!1';
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

    // Set password expiry to 7 days
    const tempPasswordExpiry = new Date();
    tempPasswordExpiry.setDate(tempPasswordExpiry.getDate() + 7);

    // Create auth user
    const adminClient = await createAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError || !authData.user) {
      logger.auth.error('Failed to create user auth', { error: authError, email });
      return internalError('Failed to create user account');
    }

    const authUserId = authData.user.id;

    // Determine system role based on org role
    const systemRole = orgRole === 'owner' || orgRole === 'admin' ? 'org_admin'
                     : orgRole === 'user_admin' ? 'user_admin'
                     : 'org_user';

    // Create database user
    const [newUser] = await db.insert(users).values({
      id: authUserId,
      email: email.toLowerCase().trim(),
      fullName,
      organizationId: currentUser.organizationId,
      role: systemRole,
      accountStatus: 'pending',
      tempPassword: hashedTempPassword,
      requirePasswordChange: true,
      tempPasswordExpiresAt: tempPasswordExpiry,
      createdBy: currentUser.id,
    }).returning();

    // Create organization membership
    await db.insert(organizationMembers).values({
      userId: newUser.id,
      organizationId: currentUser.organizationId!,
      role: orgRole,
      invitedBy: currentUser.id,
    });

    // Update organization seat count
    await db
      .update(organizations)
      .set({ currentSeats: currentMemberCount + 1 })
      .where(eq(organizations.id, currentUser.organizationId!));

    // Send credentials email
    const emailData = {
      recipientName: fullName,
      recipientEmail: email,
      organizationName: organization.name,
      tempPassword,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      expiryDays: 7,
    };

    const emailResult = await sendEmail({
      to: email,
      subject: getNewUserCredentialsSubject(emailData),
      html: getNewUserCredentialsTemplate(emailData),
    });

    logger.admin.info('Organization user created', {
      userId: newUser.id,
      email: newUser.email,
      organizationId: currentUser.organizationId,
      createdBy: currentUser.email,
      emailSent: emailResult.success,
    });

    return successResponse({
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        orgRole,
        accountStatus: newUser.accountStatus,
      },
      emailSent: emailResult.success,
    }, 'User created successfully');
  } catch (error) {
    logger.api.error('Error creating organization user', error);
    return internalError();
  }
});
