/**
 * Admin endpoint to diagnose and fix Gmail accounts with userId issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts } from '@/lib/db/schema';
import { eq, isNull, or } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized Gmail fix check attempt');
      return unauthorized();
    }

    logger.admin.info('Checking Gmail accounts', { userId: user.id });

    // 2. Find all Gmail accounts
    const allGmailAccounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.emailProvider, 'gmail'),
    });

    logger.admin.info('Found Gmail accounts for check', {
      userId: user.id,
      gmailAccountCount: allGmailAccounts.length
    });

    // 3. Find Gmail accounts with issues
    const problemAccounts = allGmailAccounts.filter(acc =>
      !acc.userId || acc.userId !== user.id
    );

    // 4. Find user's Gmail accounts specifically
    const userGmailAccounts = allGmailAccounts.filter(acc =>
      acc.userId === user.id
    );

    logger.admin.info('Gmail accounts checked', {
      userId: user.id,
      totalGmailAccounts: allGmailAccounts.length,
      userGmailAccounts: userGmailAccounts.length,
      problemAccounts: problemAccounts.length
    });

    return successResponse({
      userId: user.id,
      userEmail: user.email,
      totalGmailAccounts: allGmailAccounts.length,
      userGmailAccounts: userGmailAccounts.length,
      problemAccounts: problemAccounts.length,
      accounts: allGmailAccounts.map(acc => ({
        id: acc.id,
        emailAddress: acc.emailAddress,
        userId: acc.userId,
        hasIssue: !acc.userId || acc.userId !== user.id,
        nylasGrantId: acc.nylasGrantId,
      }))
    });

  } catch (error) {
    logger.api.error('Error checking Gmail accounts', error);
    return internalError();
  }
}

export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized Gmail fix attempt');
      return unauthorized();
    }

    logger.admin.info('Fixing Gmail accounts', {
      userId: user.id,
      userEmail: user.email
    });

    // 2. Find Gmail accounts that match user's email but have wrong/null userId
    const gmailAccountsToFix = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.emailAddress, user.email || ''),
    });

    logger.admin.info('Found Gmail accounts to fix', {
      userId: user.id,
      email: user.email,
      accountsToCheck: gmailAccountsToFix.length
    });

    const fixed = [];
    const errors = [];

    // 3. Fix each account
    for (const account of gmailAccountsToFix) {
      if (!account.userId || account.userId !== user.id) {
        try {
          logger.admin.info('Fixing Gmail account', {
            accountId: account.id,
            emailAddress: account.emailAddress,
            userId: user.id
          });

          await db.update(emailAccounts)
            .set({
              userId: user.id,
              updatedAt: new Date(),
            })
            .where(eq(emailAccounts.id, account.id));

          fixed.push({
            id: account.id,
            emailAddress: account.emailAddress,
            oldUserId: account.userId,
            newUserId: user.id,
          });

          logger.admin.info('Fixed Gmail account', {
            accountId: account.id,
            userId: user.id
          });
        } catch (error) {
          logger.api.error('Failed to fix Gmail account', {
            error,
            accountId: account.id,
            userId: user.id
          });
          errors.push({
            id: account.id,
            emailAddress: account.emailAddress,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    logger.admin.info('Gmail accounts fixed', {
      userId: user.id,
      fixed: fixed.length,
      errors: errors.length
    });

    return successResponse({
      fixed: fixed.length,
      errors: errors.length,
      details: {
        fixed,
        errors
      }
    }, `Successfully fixed ${fixed.length} Gmail account(s)`);

  } catch (error) {
    logger.api.error('Error fixing Gmail accounts', error);
    return internalError();
  }
});
