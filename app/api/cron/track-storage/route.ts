/**
 * Cron Job: Track Storage Usage
 * Run daily to calculate and track storage usage for billing
 *
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/track-storage",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, emailAccounts } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { trackStorageUsage } from '@/lib/billing/track-usage';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/cron/track-storage
 * Calculate and track storage usage for all users
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.payment.info('Starting storage usage tracking cron job');

    // Get all active users with their storage usage
    const storageStats = await db.execute(sql`
      SELECT
        u.id as user_id,
        u.organization_id,
        COALESCE(SUM(CAST(ea.storage_used_bytes AS BIGINT)), 0) as total_storage_bytes
      FROM users u
      LEFT JOIN email_accounts ea ON ea.user_id = u.id
      WHERE u.suspended = false
      GROUP BY u.id, u.organization_id
      HAVING COALESCE(SUM(CAST(ea.storage_used_bytes AS BIGINT)), 0) > 0
    `);

    let usersTracked = 0;
    let totalBytes = 0;

    for (const row of storageStats as any[]) {
      const userId = row.user_id;
      const organizationId = row.organization_id;
      const storageBytes = parseInt(row.total_storage_bytes || '0');

      if (storageBytes > 0) {
        await trackStorageUsage(
          userId,
          organizationId || undefined,
          storageBytes,
          {
            source: 'cron_job',
            trackedAt: new Date().toISOString(),
          }
        );

        usersTracked++;
        totalBytes += storageBytes;
      }
    }

    logger.payment.info('Storage usage tracking completed', {
      usersTracked,
      totalBytes,
      totalGB: (totalBytes / (1024 * 1024 * 1024)).toFixed(2),
    });

    return NextResponse.json({
      success: true,
      usersTracked,
      totalBytes,
      totalGB: (totalBytes / (1024 * 1024 * 1024)).toFixed(2),
    });
  } catch (error) {
    logger.payment.error('Storage tracking cron job failed', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/track-storage
 * Manual trigger for testing (requires auth)
 */
export async function GET(request: NextRequest) {
  // Check if user is authenticated (for manual testing)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev-secret';

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized - Use Bearer token with CRON_SECRET' },
      { status: 401 }
    );
  }

  // Forward to POST handler
  return POST(request);
}
