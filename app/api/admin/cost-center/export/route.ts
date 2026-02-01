import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, sms_usage, ai_usage, storage_usage } from '@/lib/db/schema';
import { eq, gte, and } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/cost-center/export
 * Export cost center data as CSV (CSRF Protected, Platform Admin Only)
 */
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized cost center export attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted cost center export', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const body = await request.json();
    const { dateRange } = body;

    // Calculate date range
    const now = new Date();
    let periodStart: Date;

    switch (dateRange) {
      case 'week':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        periodStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get all usage data for the period
    const smsUsageData = await db.query.sms_usage.findMany({
      where: gte(sms_usage.createdAt, periodStart),
    });

    const aiUsageData = await db.query.ai_usage.findMany({
      where: gte(ai_usage.createdAt, periodStart),
    });

    const storageUsageData = await db.query.storage_usage.findMany({
      where: gte(storage_usage.createdAt, periodStart),
    });

    // Get user data separately
    const userIds = Array.from(new Set([
      ...smsUsageData.map(r => r.userId),
      ...aiUsageData.map(r => r.userId),
      ...storageUsageData.map(r => r.userId),
    ]));

    const userData = await db.query.users.findMany({
      where: (users, { inArray }) => inArray(users.id, userIds),
    });

    const userMap = new Map(userData.map(u => [u.id, u]));

    // Build CSV
    const csvRows: string[] = [];

    // Header
    csvRows.push(
      'Date,User ID,User Email,User Name,Service Type,Usage Amount,Cost,Description'
    );

    // SMS Usage
    smsUsageData.forEach((record) => {
      const user = userMap.get(record.userId);
      csvRows.push(
        [
          new Date(record.createdAt).toISOString().split('T')[0],
          record.userId,
          user?.email || '',
          user?.fullName || '',
          'SMS',
          record.messageCount,
          record.cost,
          `${record.messageCount} messages`,
        ].join(',')
      );
    });

    // AI Usage
    aiUsageData.forEach((record) => {
      const user = userMap.get(record.userId);
      csvRows.push(
        [
          new Date(record.createdAt).toISOString().split('T')[0],
          record.userId,
          user?.email || '',
          user?.fullName || '',
          'AI',
          record.requestCount,
          record.cost,
          `${record.requestCount} ${record.feature} requests`,
        ].join(',')
      );
    });

    // Storage Usage
    storageUsageData.forEach((record) => {
      const user = userMap.get(record.userId);
      const storageGB = ((record.storageUsed || 0) / 1073741824).toFixed(2);
      csvRows.push(
        [
          new Date(record.createdAt).toISOString().split('T')[0],
          record.userId,
          user?.email || '',
          user?.fullName || '',
          'Storage',
          storageGB,
          record.cost,
          `${storageGB} GB storage`,
        ].join(',')
      );
    });

    const csv = csvRows.join('\n');

    logger.admin.info('Cost center data exported', {
      requestedBy: dbUser.email,
      dateRange,
      totalRecords: csvRows.length - 1,
      smsRecords: smsUsageData.length,
      aiRecords: aiUsageData.length,
      storageRecords: storageUsageData.length
    });

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="cost-center-${dateRange}-${Date.now()}.csv"`,
      },
    });
  } catch (error: any) {
    logger.api.error('Error exporting cost center data', error);
    return internalError();
  }
});
