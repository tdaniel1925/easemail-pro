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

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
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
      with: {
        user: true,
      },
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
    
    return NextResponse.json(
      { 
        valid: false, 
        error: 'An error occurred validating your reset link.' 
      },
      { status: 500 }
    );
  }
}

