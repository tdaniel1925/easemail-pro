import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizations, organizationMembers, userAuditLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateSecurePassword, hashPassword, generatePasswordExpiry } from '@/lib/auth/password-utils';
import { sendEmail } from '@/lib/email/send';
import { getNewUserCredentialsTemplate, getNewUserCredentialsSubject } from '@/lib/email/templates/new-user-credentials';

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

/**
 * POST /api/admin/organizations/[orgId]/users
 * Create a new user for an organization
 * Accessible by: Platform admins and organization admins (for their own org)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { orgId } = await context.params;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user from database
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get target organization
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Authorization check: Platform admin OR org admin of this specific org
    const isPlatformAdmin = currentUser.role === 'platform_admin';
    const isOrgAdmin = currentUser.role === 'org_admin' && currentUser.organizationId === orgId;

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json({ 
        error: 'Forbidden - You do not have permission to add users to this organization' 
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { email, fullName, role = 'member' } = body;

    // Validation
    if (!email || !fullName) {
      return NextResponse.json({ 
        error: 'Email and full name are required' 
      }, { status: 400 });
    }

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be "admin" or "member"' 
      }, { status: 400 });
    }

    // Check if email is already in use
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (existingUser) {
      return NextResponse.json({ 
        error: 'A user with this email address already exists' 
      }, { status: 400 });
    }

    // Check seat limit
    const orgMembers = await db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.isActive, true)
      ),
    });

    if (organization.maxSeats && orgMembers.length >= organization.maxSeats) {
      return NextResponse.json({ 
        error: `Organization is at maximum capacity (${orgMembers.length}/${organization.maxSeats} seats). Please upgrade plan or remove inactive users.`
      }, { status: 400 });
    }

    // Generate temporary password
    const tempPassword = generateSecurePassword(16);
    const hashedTempPassword = await hashPassword(tempPassword);
    const tempPasswordExpiry = generatePasswordExpiry();

    console.log(`🔐 Generated temporary password for ${email}`);

    // Create user in Supabase Auth
    const adminClient = createClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: tempPassword,
      email_confirm: true, // Skip email verification for admin-created users
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError || !authData.user) {
      console.error('❌ Supabase Auth error:', authError);
      return NextResponse.json({ 
        error: 'Failed to create user account',
        details: authError?.message 
      }, { status: 500 });
    }

    console.log(`✅ Created Supabase Auth user: ${authData.user.id}`);

    // Create user in database
    const [newUser] = await db.insert(users).values({
      id: authData.user.id,
      email: email.toLowerCase().trim(),
      fullName,
      organizationId: orgId,
      role: role === 'admin' ? 'org_admin' : 'org_user',
      accountStatus: 'pending', // User hasn't logged in yet
      tempPassword: hashedTempPassword,
      requirePasswordChange: true,
      tempPasswordExpiresAt: tempPasswordExpiry,
      createdBy: currentUser.id,
    }).returning();

    console.log(`📝 Created database user record: ${newUser.id}`);

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

    console.log(`👥 Added user to organization members`);

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

    console.log(`📊 Logged audit event`);

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
      console.error('⚠️ Failed to send credentials email:', emailResult.error);
      // Don't fail the request - user was created successfully
      // Admin can resend credentials later
    } else {
      console.log(`✅ Credentials email sent to ${email}`);
    }

    return NextResponse.json({
      success: true,
      message: `User created successfully and credentials sent to ${email}`,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: role,
        accountStatus: newUser.accountStatus,
        tempPasswordExpiresAt: newUser.tempPasswordExpiresAt,
      },
      emailSent: emailResult.success,
    });

  } catch (error: any) {
    console.error('❌ Error creating organization user:', error);
    return NextResponse.json({ 
      error: 'Failed to create user',
      details: error.message 
    }, { status: 500 });
  }
}

