/**
 * API Route: Validate Reset Token
 * POST /api/auth/validate-reset-token
 * 
 * Validates a password reset token before allowing password change
 * 
 * Checks:
 * - Token exists
 * - Token not expired
 * - Token not already used
 * - User still exists
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { passwordResetTokens, users } from '@/lib/db/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { authRateLimit, enforceRateLimit } from '@/lib/security/rate-limiter';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const rateLimitResult = await enforceRateLimit(authRateLimit, `validate-token:${ip}`);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { valid: false, error: rateLimitResult.error },
        {
          status: 429,
          headers: rateLimitResult.headers
        }
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find token in database
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: eq(passwordResetTokens.token, token),
    });

    if (!resetToken) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired reset link. Please request a new one.',
      });
    }

    // Check if token has been used
    if (resetToken.usedAt) {
      return NextResponse.json({
        valid: false,
        error: 'This reset link has already been used. Please request a new one.',
      });
    }

    // Check if token is expired
    const now = new Date();
    if (resetToken.expiresAt < now) {
      return NextResponse.json({
        valid: false,
        error: 'This reset link has expired. Please request a new one.',
      });
    }

    // Check if user still exists (might have been deleted)
    const user = await db.query.users.findFirst({
      where: eq(users.id, resetToken.userId),
    });

    if (!user) {
      return NextResponse.json({
        valid: false,
        error: 'User account not found.',
      });
    }

    // Token is valid
    return NextResponse.json({
      valid: true,
      email: user.email,
      expiresAt: resetToken.expiresAt,
    });

  } catch (error: any) {
    console.error('❌ Token validation error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    
    // Check if it's a "table doesn't exist" error
    if (error.message?.includes('password_reset_tokens') || 
        error.code === '42P01' || 
        error.message?.includes('relation') ||
        error.message?.includes('does not exist')) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Password reset system is not yet configured. Please contact support or run the database migration.' 
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        valid: false, 
        error: 'An error occurred validating your reset link. Please try again or contact support.' 
      },
      { status: 500 }
    );
  }
}

