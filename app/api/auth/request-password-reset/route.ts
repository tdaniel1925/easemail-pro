/**
 * API Route: Request Password Reset
 * POST /api/auth/request-password-reset
 * 
 * Custom password reset flow via Resend (bypasses Supabase auth rate limits)
 * 
 * Flow:
 * 1. Validate email exists
 * 2. Generate secure cryptographic token
 * 3. Store token in database with 1-hour expiry
 * 4. Send email via Resend with reset link
 * 5. Return success (no information leakage)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, passwordResetTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email/send';
import { getPasswordResetTemplate, getPasswordResetSubject } from '@/lib/email/templates/password-reset';
import { authRateLimit, enforceRateLimit } from '@/lib/security/rate-limiter';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get IP for rate limiting and audit trail
    const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Rate limiting (Upstash Redis - 5 requests per 10 seconds per IP)
    const rateLimitResult = await enforceRateLimit(authRateLimit, `password-reset:${ip}`);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: rateLimitResult.error
        },
        {
          status: 429,
          headers: rateLimitResult.headers
        }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, emailLower),
    });

    // SECURITY: Always return success to prevent email enumeration
    // Don't reveal if email exists or not
    if (!user) {
      console.log(`🔒 Password reset requested for non-existent email: ${emailLower}`);
      
      // Still return success after a delay (timing attack prevention)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return NextResponse.json({
        success: true,
        message: 'If that email exists, a password reset link has been sent.',
      });
    }

    // Generate cryptographically secure token (32 bytes = 64 hex chars)
    const token = crypto.randomBytes(32).toString('hex');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store token in database
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
      ipAddress: ip,
      userAgent,
    });

    // Generate reset link
    const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin')}/change-password?token=${token}`;

    // Send email via Resend
    const emailData = {
      recipientName: user.fullName || user.email,
      resetLink,
      expiryHours: 1,
    };

    const emailResult = await sendEmail({
      to: user.email,
      subject: getPasswordResetSubject(emailData),
      html: getPasswordResetTemplate(emailData),
    });

    if (!emailResult.success) {
      console.error('❌ Failed to send password reset email:', emailResult.error);
      
      // Don't expose email send failures to user
      // Log for admin debugging
      return NextResponse.json({
        success: true,
        message: 'If that email exists, a password reset link has been sent.',
      });
    }

    console.log(`✅ Password reset email sent to: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'If that email exists, a password reset link has been sent.',
    });

  } catch (error: any) {
    console.error('❌ Password reset request error:', error);
    
    // Generic error message (don't expose internal errors)
    return NextResponse.json(
      { 
        success: false, 
        error: 'An error occurred. Please try again later.' 
      },
      { status: 500 }
    );
  }
}

