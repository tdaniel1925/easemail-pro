import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizations, organizationMembers } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { checkRateLimit } from '@/lib/middleware/rate-limit';
import { sendEmail } from '@/lib/email/send';
import {
  getNewUserCredentialsTemplate,
  getNewUserCredentialsSubject,
} from '@/lib/email/templates/new-user-credentials';
import { successResponse, unauthorized, forbidden, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';
import * as bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// GET: Fetch all organizations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized organizations list access');
      return unauthorized();
    }

    // Check rate limit (5 requests per minute)
    const rateLimitResult = await checkRateLimit('admin', `user:${user.id}`);
    if (!rateLimitResult.allowed) {
      logger.security.warn('Admin rate limit exceeded', {
        userId: user.id,
        endpoint: '/api/admin/organizations',
      });
      return rateLimitResult.response!;
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to list organizations', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
      });
      return forbidden('Platform admin access required');
    }

    // Fetch all organizations
    const orgs = await db.query.organizations.findMany();

    // Add comprehensive counts for each organization
    const orgsWithCounts = await Promise.all(
      orgs.map(async (org) => {
        // Count organization members (from organization_members table)
        const memberCountResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(organizationMembers)
          .where(eq(organizationMembers.organizationId, org.id));

        // Count users linked to this organization (from users table)
        const userCountResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(eq(users.organizationId, org.id));

        const memberCount = Number(memberCountResult[0]?.count || 0);
        const userCount = Number(userCountResult[0]?.count || 0);

        // Use the higher of the two counts (in case members table isn't populated)
        const actualMemberCount = Math.max(memberCount, userCount);

        return {
          ...org,
          currentSeats: actualMemberCount, // Update current seats to reflect actual count
          _count: {
            members: actualMemberCount,
            users: userCount,
          },
        };
      })
    );

    logger.admin.info('Organizations list fetched', {
      requestedBy: dbUser.email,
      organizationCount: orgsWithCounts.length
    });

    return successResponse({ organizations: orgsWithCounts });
  } catch (error) {
    logger.api.error('Organizations fetch error', error);
    return internalError();
  }
}

// POST: Create new organization (CSRF Protected)
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized organization creation attempt');
      return unauthorized();
    }

    // Check rate limit (5 requests per minute)
    const rateLimitResult = await checkRateLimit('admin', `user:${user.id}`);
    if (!rateLimitResult.allowed) {
      logger.security.warn('Admin rate limit exceeded', {
        userId: user.id,
        endpoint: '/api/admin/organizations',
      });
      return rateLimitResult.response!;
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to create organization', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
      });
      return forbidden('Platform admin access required');
    }

    const body = await request.json();
    const {
      name,
      slug,
      planType,
      billingEmail,
      maxSeats,
      ownerEmail,
      ownerFullName,
      ownerPhone,
      ownerTitle,
      sendWelcomeEmail
    } = body;

    // Validate required fields
    if (!name || !slug) {
      logger.admin.warn('Missing required fields for organization creation', {
        hasName: !!name,
        hasSlug: !!slug,
        requestedBy: dbUser.email
      });
      return badRequest('Name and slug are required');
    }

    if (!ownerEmail || !ownerFullName) {
      logger.admin.warn('Missing owner information', {
        hasOwnerEmail: !!ownerEmail,
        hasOwnerFullName: !!ownerFullName,
        requestedBy: dbUser.email
      });
      return badRequest('Owner email and full name are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ownerEmail)) {
      logger.admin.warn('Invalid owner email format', {
        email: ownerEmail,
        requestedBy: dbUser.email
      });
      return badRequest('Invalid owner email format');
    }

    // Check if slug is already taken
    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });

    if (existing) {
      logger.admin.warn('Attempted to create organization with duplicate slug', {
        slug,
        requestedBy: dbUser.email
      });
      return badRequest('Slug already in use');
    }

    // Check if owner email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, ownerEmail.toLowerCase().trim()),
    });

    if (existingUser) {
      logger.admin.warn('Owner email already in use', {
        email: ownerEmail,
        requestedBy: dbUser.email
      });
      return badRequest('Owner email is already in use by another account');
    }

    // Create organization
    const [newOrg] = await db.insert(organizations).values({
      name,
      slug,
      planType: planType || 'team',
      billingEmail: billingEmail || null,
      maxSeats: maxSeats || 10,
      currentSeats: 1, // Start with 1 for the owner
      isActive: true,
    }).returning();

    logger.admin.info('Organization created', {
      organizationId: newOrg.id,
      name: newOrg.name,
      slug: newOrg.slug,
      planType: newOrg.planType,
      createdBy: dbUser.email
    });

    // Generate temporary password for owner
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + '!1';
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

    // Set password expiry to 7 days from now
    const tempPasswordExpiry = new Date();
    tempPasswordExpiry.setDate(tempPasswordExpiry.getDate() + 7);

    // Create Supabase auth user for owner
    const adminClient = await createAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: ownerEmail.toLowerCase().trim(),
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: ownerFullName,
      },
    });

    if (authError || !authData.user) {
      logger.auth.error('Failed to create owner auth user', {
        error: authError,
        email: ownerEmail,
        organizationId: newOrg.id
      });

      // Rollback: Delete the organization since owner creation failed
      await db.delete(organizations).where(eq(organizations.id, newOrg.id));

      return internalError('Failed to create owner user account');
    }

    const authUserId = authData.user.id;
    logger.auth.info('Created owner auth user', {
      authUserId,
      email: ownerEmail,
      organizationId: newOrg.id
    });

    // Create owner user in database
    const [ownerUser] = await db.insert(users).values({
      id: authUserId,
      email: ownerEmail.toLowerCase().trim(),
      fullName: ownerFullName,
      organizationId: newOrg.id,
      role: 'org_admin', // Organization-level admin role
      accountStatus: 'pending', // Pending until they set their password
      tempPassword: hashedTempPassword,
      requirePasswordChange: true,
      tempPasswordExpiresAt: tempPasswordExpiry,
      createdBy: dbUser.id,
    }).returning();

    logger.db.info('Created owner database user', {
      userId: ownerUser.id,
      email: ownerUser.email,
      organizationId: newOrg.id,
      createdBy: dbUser.email
    });

    // Create organization membership record with 'owner' role
    await db.insert(organizationMembers).values({
      userId: ownerUser.id,
      organizationId: newOrg.id,
      role: 'owner', // Highest role within the organization
      invitedBy: dbUser.id,
    });

    logger.db.info('Created owner membership', {
      userId: ownerUser.id,
      organizationId: newOrg.id,
      role: 'owner'
    });

    // Send welcome email with credentials (if requested)
    let emailSent = false;
    if (sendWelcomeEmail !== false) { // Default to true
      const emailData = {
        recipientName: ownerFullName,
        recipientEmail: ownerEmail,
        organizationName: newOrg.name,
        tempPassword: tempPassword,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
        expiryDays: 7,
      };

      const emailResult = await sendEmail({
        to: ownerEmail,
        subject: getNewUserCredentialsSubject(emailData),
        html: getNewUserCredentialsTemplate(emailData),
      });

      emailSent = emailResult.success;

      if (!emailSent) {
        logger.email.error('Failed to send owner credentials email', {
          email: ownerEmail,
          organizationId: newOrg.id
        });
      } else {
        logger.email.info('Owner credentials email sent', {
          email: ownerEmail,
          organizationId: newOrg.id
        });
      }
    }

    logger.admin.info('Organization and owner created successfully', {
      organizationId: newOrg.id,
      organizationName: newOrg.name,
      ownerId: ownerUser.id,
      ownerEmail: ownerUser.email,
      emailSent,
      createdBy: dbUser.email
    });

    return successResponse({
      organization: newOrg,
      owner: {
        id: ownerUser.id,
        email: ownerUser.email,
        fullName: ownerUser.fullName,
        role: ownerUser.role,
        accountStatus: ownerUser.accountStatus,
      },
      emailSent,
    }, 'Organization and owner account created successfully');
  } catch (error) {
    logger.api.error('Organization create error', error);
    return internalError();
  }
});

