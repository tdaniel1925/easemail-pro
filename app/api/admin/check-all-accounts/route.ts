
export const dynamic = 'force-dynamic';
/**
 * Admin endpoint to check all accounts and their providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { successResponse, unauthorized, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized account check attempt');
      return unauthorized();
    }

    logger.admin.info('Checking accounts', { userId: user.id });

    // 2. Find all user's accounts
    const allUserAccounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.userId, user.id),
    });

    console.log(`[Account Check] Found ${allUserAccounts.length} accounts`);

    // Group by provider
    const byProvider: Record<string, any[]> = {};
    allUserAccounts.forEach(acc => {
      const provider = acc.emailProvider || 'unknown';
      if (!byProvider[provider]) {
        byProvider[provider] = [];
      }
      byProvider[provider].push({
        id: acc.id,
        emailAddress: acc.emailAddress,
        provider: acc.provider,
        emailProvider: acc.emailProvider,
        nylasProvider: acc.nylasProvider,
        nylasGrantId: acc.nylasGrantId,
        userId: acc.userId,
      });
    });

    logger.admin.info('Accounts checked', {
      userId: user.id,
      totalAccounts: allUserAccounts.length
    });

    return successResponse({
      userId: user.id,
      userEmail: user.email,
      totalAccounts: allUserAccounts.length,
      byProvider,
      allAccounts: allUserAccounts.map(acc => ({
        id: acc.id,
        emailAddress: acc.emailAddress,
        provider: acc.provider,
        emailProvider: acc.emailProvider,
        nylasProvider: acc.nylasProvider,
        nylasGrantId: acc.nylasGrantId,
        userId: acc.userId
      }))
    });

  } catch (error) {
    logger.api.error('Error checking accounts', error);
    return internalError();
  }
}
