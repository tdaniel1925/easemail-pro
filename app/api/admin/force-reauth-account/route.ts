import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, badRequest, notFound, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/force-reauth-account (CSRF Protected)
 * Force an email account to require re-authentication
 * This clears tokens and marks the account for re-auth
 */
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized force reauth attempt');
      return unauthorized();
    }

    const { email } = await request.json();

    if (!email) {
      logger.admin.warn('Force reauth missing email', { userId: user.id });
      return badRequest('Email is required');
    }

    // Find the account
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.emailAddress, email),
    });

    if (!account) {
      logger.admin.warn('Account not found for force reauth', { userId: user.id, email });
      return notFound(`No account found for ${email}`);
    }

    // Clear tokens and force re-auth
    await db
      .update(emailAccounts)
      .set({
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        syncStatus: 'paused',
        lastError: 'Re-authentication required',
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, account.id));

    logger.admin.info('Account marked for re-authentication', {
      userId: user.id,
      email,
      accountId: account.id,
      grantId: account.nylasGrantId
    });

    return successResponse({
      accountId: account.id,
      grantId: account.nylasGrantId
    }, `Account ${email} marked for re-authentication`);
  } catch (error: any) {
    logger.api.error('Force reauth error', error);
    return internalError();
  }
});
