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

    // Check if user exists in Supabase Auth (to prevent duplicate auth users)
    const adminClient = createAdminClient();
    const { data: existingAuthUsers } = await adminClient.auth.admin.listUsers();
    const authUserExists = existingAuthUsers?.users?.some(
      u => u.email?.toLowerCase() === email.toLowerCase().trim()
    );

    let authUserId: string;
    const invitationToken = generateInvitationToken();
    const invitationExpiry = generateInvitationExpiry(7); // 7 days

    if (authUserExists) {
      // User exists in auth but not in our DB - get their ID
      const existingAuthUser = existingAuthUsers?.users?.find(
        u => u.email?.toLowerCase() === email.toLowerCase().trim()
      );
      authUserId = existingAuthUser!.id;
      
      console.log(`♻️ Reusing existing Supabase Auth user: ${authUserId}`);
      
      // Update their metadata
      await adminClient.auth.admin.updateUserById(authUserId, {
        user_metadata: {
          full_name: fullName,
        },
        email_confirm: false, // They need to accept invitation first
      });
    } else {
      // Create new auth user with a random password (they'll set their own)
      const randomPassword = Math.random().toString(36).slice(-32); // Temporary, won't be used
      
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: randomPassword,
        email_confirm: false, // They need to accept invitation first
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

      authUserId = authData.user.id;
      console.log(`✅ Created Supabase Auth user: ${authUserId}`);
    }

    // Create user in database with invitation token
    const [newUser] = await db.insert(users).values({
      id: authUserId,
      email: email.toLowerCase().trim(),
      fullName,
      organizationId: organizationId || null,
      role: role,
      accountStatus: 'pending', // User hasn't accepted invitation yet
      invitationToken: invitationToken,
      invitationExpiresAt: invitationExpiry,
      invitedBy: currentUser.id,
      createdBy: currentUser.id,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: email.toLowerCase().trim(),
        fullName,
        organizationId: organizationId || null,
        role: role,
        accountStatus: 'pending',
        invitationToken: invitationToken,
        invitationExpiresAt: invitationExpiry,
        invitedBy: currentUser.id,
        updatedAt: new Date(),
      },
    })
    .returning();

    console.log(`📝 Created/updated database user record: ${newUser.id}`);

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

    // Send invitation email
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${invitationToken}`;
    
    const emailData = {
      recipientName: fullName,
      recipientEmail: email,
      invitationUrl: invitationUrl,
      inviterName: currentUser.fullName || currentUser.email,
      expiryDays: 7,
    };

    const emailResult = await sendEmail({
      to: email,
      subject: getInvitationEmailSubject(emailData),
      html: getInvitationEmailTemplate(emailData),
    });

    if (!emailResult.success) {
      console.error('⚠️ Failed to send invitation email:', emailResult.error);
      // Don't fail the request - user was created successfully
    } else {
      console.log(`✅ Invitation email sent to ${email}`);
    }

    return NextResponse.json({
      success: true,
      message: `User created successfully. Invitation email sent to ${email}`,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        accountStatus: newUser.accountStatus,
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

