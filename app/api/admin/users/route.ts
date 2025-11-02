import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, emailAccounts, userAuditLogs } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { generateSecurePassword, hashPassword, generatePasswordExpiry } from '@/lib/auth/password-utils';
import { sendEmail } from '@/lib/email/send';
import { getNewUserCredentialsTemplate, getNewUserCredentialsSubject } from '@/lib/email/templates/new-user-credentials';

// GET: List all users (admin only)
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    // Fetch all users with email account counts
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        emailAccountCount: sql<number>`count(${emailAccounts.id})::int`,
      })
      .from(users)
      .leftJoin(emailAccounts, eq(users.id, emailAccounts.userId))
      .groupBy(users.id)
      .orderBy(users.createdAt);

    // Transform to include _count
    const usersWithCounts = allUsers.map(u => ({
      ...u,
      _count: {
        emailAccounts: u.emailAccountCount,
      },
    }));

    return NextResponse.json({ success: true, users: usersWithCounts });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST: Create a new user (platform admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user from database
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!currentUser || currentUser.role !== 'platform_admin') {
      return NextResponse.json({ 
        error: 'Forbidden - Platform admin access required' 
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { email, fullName, role = 'individual', organizationId } = body;

    // Validation
    if (!email || !fullName) {
      return NextResponse.json({ 
        error: 'Email and full name are required' 
      }, { status: 400 });
    }

    const validRoles = ['platform_admin', 'org_admin', 'org_user', 'individual'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
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

    // Generate temporary password
    const tempPassword = generateSecurePassword(16);
    const hashedTempPassword = await hashPassword(tempPassword);
    const tempPasswordExpiry = generatePasswordExpiry();

    console.log(`🔐 Generated temporary password for ${email}`);

    // Create user in Supabase Auth using admin client
    const adminClient = createAdminClient();
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
      organizationId: organizationId || null,
      role: role,
      accountStatus: 'pending', // User hasn't logged in yet
      tempPassword: hashedTempPassword,
      requirePasswordChange: true,
      tempPasswordExpiresAt: tempPasswordExpiry,
      createdBy: currentUser.id,
    }).returning();

    console.log(`📝 Created database user record: ${newUser.id}`);

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

    console.log(`📊 Logged audit event`);

    // Send credentials email
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;
    
    const emailData = {
      recipientName: fullName,
      recipientEmail: email,
      organizationName: 'EaseMail',
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
        role: newUser.role,
        accountStatus: newUser.accountStatus,
        tempPasswordExpiresAt: newUser.tempPasswordExpiresAt,
      },
      emailSent: emailResult.success,
    });

  } catch (error: any) {
    console.error('❌ Error creating user:', error);
    return NextResponse.json({ 
      error: 'Failed to create user',
      details: error.message 
    }, { status: 500 });
  }
}

