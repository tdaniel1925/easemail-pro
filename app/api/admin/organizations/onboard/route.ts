import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizations, organizationMembers, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/send';
import { getNewUserCredentialsSubject, getNewUserCredentialsTemplate } from '@/lib/email/templates/new-user-credentials';
import crypto from 'crypto';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/organizations/onboard
 * Comprehensive organization onboarding with user account creation (CSRF Protected)
 */
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized organization onboarding attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted organization onboarding', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const body = await request.json();
    const {
      // Company Information
      name,
      slug,
      website,
      industry,
      companySize,
      description,
      
      // Business Address
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country,
      
      // Primary Contact
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone,
      primaryContactTitle,
      
      // Billing Contact
      billingContactName,
      billingContactEmail,
      billingContactPhone,
      
      // Technical Contact
      techContactName,
      techContactEmail,
      techContactPhone,
      
      // Subscription Details
      planType,
      maxSeats,
      billingEmail,
      billingCycle,
      
      // Additional Information
      taxId,
      purchaseOrderNumber,
      notes,
    } = body;

    // Validation
    if (!name || !slug) {
      logger.admin.warn('Missing required fields for organization onboarding', {
        hasName: !!name,
        hasSlug: !!slug,
        requestedBy: dbUser.email
      });
      return badRequest('Name and slug are required');
    }

    if (!primaryContactName || !primaryContactEmail || !primaryContactPhone) {
      logger.admin.warn('Missing primary contact information', {
        requestedBy: dbUser.email
      });
      return badRequest('Primary contact information is required');
    }

    if (!addressLine1 || !city || !state || !zipCode || !country) {
      logger.admin.warn('Missing business address information', {
        requestedBy: dbUser.email
      });
      return badRequest('Complete business address is required');
    }

    // Check if slug is already taken
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });

    if (existingOrg) {
      logger.admin.warn('Slug already in use for organization onboarding', {
        slug,
        requestedBy: dbUser.email
      });
      return badRequest('Slug already in use');
    }

    // Check if primary contact email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, primaryContactEmail),
    });

    if (existingUser) {
      logger.admin.warn('Primary contact email already exists', {
        email: primaryContactEmail,
        requestedBy: dbUser.email
      });
      return badRequest('Primary contact email already has an account. Please use a different email or invite them to the organization instead.');
    }

    // Generate secure temporary password
    const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 16);

    // Create user account in Supabase
    const supabaseAdmin = await createAdminClient();
    const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: primaryContactEmail,
      password: tempPassword,
      email_confirm: true, // Auto-confirm since admin is creating
      user_metadata: {
        full_name: primaryContactName,
        account_type: 'team',
        organization_name: name,
      },
    });

    if (authError || !newAuthUser.user) {
      logger.api.error('Failed to create Supabase user for organization onboarding', {
        error: authError,
        email: primaryContactEmail,
        orgName: name,
        requestedBy: dbUser.email
      });
      return internalError('Failed to create user account');
    }

    // Create organization record
    const [newOrg] = await db.insert(organizations).values({
      name,
      slug,
      planType: planType || 'team',
      billingEmail: billingEmail || primaryContactEmail,
      maxSeats: maxSeats || 10,
      currentSeats: 1, // Primary contact counts as first seat
      isActive: true,
    }).returning();

    // Create user record in database with org_admin role
    await db.insert(users).values({
      id: newAuthUser.user.id,
      email: primaryContactEmail,
      fullName: primaryContactName,
      role: 'org_admin',
      organizationId: newOrg.id,
      requirePasswordChange: true, // Force password change on first login
    });

    // Create organization membership (primary contact as owner)
    await db.insert(organizationMembers).values({
      organizationId: newOrg.id,
      userId: newAuthUser.user.id,
      role: 'owner',
      isActive: true,
    });

    // Create subscription record
    await db.insert(subscriptions).values({
      organizationId: newOrg.id,
      planName: planType || 'team',
      billingCycle: billingCycle || 'monthly',
      seatsIncluded: maxSeats || 10,
      status: 'trialing',
    });

    // Send welcome email to primary contact
    try {
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/login`;
      
      await sendEmail({
        to: primaryContactEmail,
        subject: getNewUserCredentialsSubject({
          recipientName: primaryContactName,
          recipientEmail: primaryContactEmail,
          organizationName: name,
          tempPassword,
          loginUrl,
          expiryDays: 30,
          adminName: dbUser.fullName || dbUser.email,
        }),
        html: getNewUserCredentialsTemplate({
          recipientName: primaryContactName,
          recipientEmail: primaryContactEmail,
          organizationName: name,
          tempPassword,
          loginUrl,
          expiryDays: 30,
          adminName: dbUser.fullName || dbUser.email,
        }),
      });

      logger.admin.info('Welcome email sent to primary contact', {
        email: primaryContactEmail,
        orgName: name,
        requestedBy: dbUser.email
      });
    } catch (emailError) {
      logger.api.error('Failed to send welcome email', {
        error: emailError,
        email: primaryContactEmail,
        orgName: name,
        requestedBy: dbUser.email
      });
      // Don't fail the entire request if email fails
    }

    logger.admin.info('Organization onboarding complete', {
      orgId: newOrg.id,
      orgName: name,
      slug,
      planType,
      primaryContactId: newAuthUser.user.id,
      primaryContactEmail,
      requestedBy: dbUser.email,
      details: {
        company: { website, industry, companySize, description },
        address: { addressLine1, addressLine2, city, state, zipCode, country },
        contacts: {
          primary: { name: primaryContactName, email: primaryContactEmail, phone: primaryContactPhone, title: primaryContactTitle },
          billing: { name: billingContactName, email: billingContactEmail, phone: billingContactPhone },
          technical: { name: techContactName, email: techContactEmail, phone: techContactPhone },
        },
        billing: { cycle: billingCycle, taxId, purchaseOrderNumber },
        notes,
      }
    });

    return successResponse({
      organization: newOrg,
      primaryContact: {
        email: primaryContactEmail,
        name: primaryContactName,
      }
    }, `Organization created successfully! Welcome email sent to ${primaryContactEmail}`, 201);
  } catch (error: any) {
    logger.api.error('Error onboarding organization', error);
    return internalError();
  }
});


