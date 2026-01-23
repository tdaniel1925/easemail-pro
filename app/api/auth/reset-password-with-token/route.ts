/**
 * API Route: Reset Password with Token
 * POST /api/auth/reset-password-with-token
 * 
 * Resets user's password using a valid reset token
 * 
 * Flow:
 * 1. Validate token (same checks as validate-reset-token)
 * 2. Update password in Supabase Auth
 * 3. Mark token as used
 * 4. Update user record in database
 * 5. Return success
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { passwordResetTokens, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createAdminClient } from '@/lib/supabase/server';
import { authRateLimit, enforceRateLimit } from '@/lib/security/rate-limiter';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ✅ SECURITY: Input validation schema
const resetPasswordSchema = z.object({
  token: z.string().min(32).max(512),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/, 'Password must contain at least one special character'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const rateLimitResult = await enforceRateLimit(authRateLimit, `reset-password:${ip}`);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: rateLimitResult.error },
        {
          status: 429,
          headers: rateLimitResult.headers
        }
      );
    }

    const body = await request.json();

    // ✅ SECURITY: Validate input with Zod schema
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    const { token, newPassword } = validationResult.data;

    // ✅ SECURITY: Find and validate token
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: eq(passwordResetTokens.token, token),
    });

    const now = new Date();

    // ✅ SECURITY: Use constant error message to prevent timing attacks
    // Don't reveal whether token exists, is expired, or is used
    const genericError = 'Invalid or expired reset link';

    if (!resetToken) {
      return NextResponse.json(
        { success: false, error: genericError },
        { status: 400 }
      );
    }

    // Check if token has been used
    if (resetToken.usedAt) {
      return NextResponse.json(
        { success: false, error: genericError },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (resetToken.expiresAt < now) {
      return NextResponse.json(
        { success: false, error: genericError },
        { status: 400 }
      );
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, resetToken.userId),
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User account not found' },
        { status: 404 }
      );
    }

    // Update password in Supabase Auth using admin client
    const adminClient = await createAdminClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('❌ Supabase password update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Mark token as used
    // NOTE: Consider adding a cron job to delete expired/used tokens after 7 days for cleanup
    await db.update(passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(passwordResetTokens.id, resetToken.id));

    // Update user record (clear temp password fields if they exist)
    await db.update(users)
      .set({
        requirePasswordChange: false,
        tempPassword: null,
        tempPasswordExpiresAt: null,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    console.log(`✅ Password reset successful for user: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    });

  } catch (error: any) {
    console.error('❌ Password reset error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An error occurred resetting your password' 
      },
      { status: 500 }
    );
  }
}

