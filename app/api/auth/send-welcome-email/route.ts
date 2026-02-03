import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizations, organizationMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendOrganizationWelcomeEmail } from '@/lib/email/organization-emails';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/send-welcome-email
 * Send welcome email after successful signup
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user data
    const userData = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has an organization
    if (!userData.organizationId) {
      logger.email.info('No organization for user, skipping welcome email', {
        userId: user.id,
        email: user.email,
      });

      return NextResponse.json({
        success: true,
        message: 'No organization to send welcome email for',
      });
    }

    // Get organization data
    const orgData = await db.query.organizations.findFirst({
      where: eq(organizations.id, userData.organizationId),
    });

    if (!orgData) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if user is the owner
    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, orgData.id),
        eq(organizationMembers.userId, user.id)
      ),
    });

    if (!membership || membership.role !== 'owner') {
      logger.email.info('User is not organization owner, skipping welcome email', {
        userId: user.id,
        email: user.email,
        organizationId: orgData.id,
        role: membership?.role,
      });

      return NextResponse.json({
        success: true,
        message: 'Welcome email only sent to organization owners',
      });
    }

    // Send welcome email
    const emailResult = await sendOrganizationWelcomeEmail({
      ownerName: userData.fullName || user.email || 'there',
      ownerEmail: user.email || '',
      organizationName: orgData.name,
      organizationSlug: orgData.slug,
    });

    if (!emailResult.success) {
      logger.email.error('Failed to send organization welcome email', {
        userId: user.id,
        email: user.email,
        organizationId: orgData.id,
        error: emailResult.error,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send welcome email',
          details: emailResult.error,
        },
        { status: 500 }
      );
    }

    logger.email.info('Organization welcome email sent successfully', {
      userId: user.id,
      email: user.email,
      organizationId: orgData.id,
      organizationName: orgData.name,
    });

    return NextResponse.json({
      success: true,
      message: 'Welcome email sent successfully',
    });
  } catch (error: any) {
    logger.api.error('Error sending welcome email', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
