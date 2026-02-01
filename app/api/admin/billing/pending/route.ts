import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAccountsWithPendingCharges } from '@/lib/billing/automated-billing';
import { successResponse, unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/billing/pending
 *
 * Get preview of upcoming charges
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized pending charges access');
      return unauthorized();
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'admin') {
      logger.security.warn('Non-admin attempted to access pending charges', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Admin access required');
    }

    // Get pending charges
    const pendingCharges = await getAccountsWithPendingCharges();

    // Calculate totals
    const summary = {
      totalAccounts: pendingCharges.length,
      totalCharges: pendingCharges.reduce((sum, p) => sum + p.totalCharges, 0),
      accountsWithoutPaymentMethod: pendingCharges.filter(p => !p.hasPaymentMethod).length,
      breakdown: {
        sms: pendingCharges.reduce((sum, p) => sum + p.smsCharges, 0),
        ai: pendingCharges.reduce((sum, p) => sum + p.aiCharges, 0),
        storage: pendingCharges.reduce((sum, p) => sum + p.storageCharges, 0),
      },
    };

    logger.admin.info('Pending charges fetched', {
      requestedBy: dbUser.email,
      totalAccounts: summary.totalAccounts,
      totalCharges: summary.totalCharges
    });

    return successResponse({
      summary,
      pendingCharges: pendingCharges.map(p => ({
        userId: p.userId,
        organizationId: p.organizationId,
        charges: {
          sms: p.smsCharges,
          ai: p.aiCharges,
          storage: p.storageCharges,
          total: p.totalCharges,
        },
        hasPaymentMethod: p.hasPaymentMethod,
        isPromoUser: p.isPromoUser,
      }))
    });
  } catch (error: any) {
    logger.api.error('Error fetching pending charges', error);
    return internalError();
  }
}

