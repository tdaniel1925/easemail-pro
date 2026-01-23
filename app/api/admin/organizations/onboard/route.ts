import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizations, organizationMembers, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/send';
import { getNewUserCredentialsSubject, getNewUserCredentialsTemplate } from '@/lib/email/templates/new-user-credentials';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/organizations/onboard
 * Comprehensive organization onboarding with user account creation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
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
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    if (!primaryContactName || !primaryContactEmail || !primaryContactPhone) {
      return NextResponse.json({ error: 'Primary contact information is required' }, { status: 400 });
    }

    if (!addressLine1 || !city || !state || !zipCode || !country) {
      return NextResponse.json({ error: 'Complete business address is required' }, { status: 400 });
    }

    // Check if slug is already taken
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });

    if (existingOrg) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 400 });
    }

    // Check if primary contact email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, primaryContactEmail),
    });

    if (existingUser) {
      return NextResponse.json({ 
        error: 'Primary contact email already has an account. Please use a different email or invite them to the organization instead.' 
      }, { status: 400 });
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
      console.error('Failed to create Supabase user:', authError);
      return NextResponse.json({ 
        error: 'Failed to create user account',
        details: authError?.message 
      }, { status: 500 });
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

      console.log(`✅ Welcome email sent to ${primaryContactEmail}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the entire request if email fails
    }

    console.log(`✅ Organization onboarded: ${name} by admin ${dbUser.email}`);
    console.log(`✅ Primary contact user created: ${primaryContactEmail}`);
    
    // Log comprehensive onboarding data for reference
    console.log('📋 Onboarding Details:', {
      organization: { id: newOrg.id, name, slug, planType },
      primaryContact: { 
        id: newAuthUser.user.id,
        name: primaryContactName, 
        email: primaryContactEmail, 
        phone: primaryContactPhone, 
        title: primaryContactTitle 
      },
      company: { website, industry, companySize, description },
      address: { addressLine1, addressLine2, city, state, zipCode, country },
      contacts: {
        billing: { name: billingContactName, email: billingContactEmail, phone: billingContactPhone },
        technical: { name: techContactName, email: techContactEmail, phone: techContactPhone },
      },
      billing: { cycle: billingCycle, taxId, purchaseOrderNumber },
      notes,
    });

    return NextResponse.json({ 
      success: true, 
      message: `Organization created successfully! Welcome email sent to ${primaryContactEmail}`,
      organization: newOrg,
      primaryContact: {
        email: primaryContactEmail,
        name: primaryContactName,
      }
    });
  } catch (error: any) {
    console.error('Organization onboarding error:', error);
    return NextResponse.json({ 
      error: 'Failed to create organization',
      details: error.message 
    }, { status: 500 });
  }
}


