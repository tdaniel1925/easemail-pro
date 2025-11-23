import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, smsUsage, aiUsage, storageUsage, emailAccounts, emails } from '@/lib/db/schema';
import { eq, sql, gte, lte, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/track-usage
 * Cron job to track and record usage metrics for all users
 * Should be run daily or hourly via a cron service (e.g., Vercel Cron, GitHub Actions)
 *
 * Usage: curl -X POST https://yourdomain.com/api/cron/track-usage \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting usage tracking cron job...');

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get all non-promo users
    const allUsers = await db.select().from(users);
    const activeUsers = allUsers.filter(u => !u.isPromoUser && u.accountStatus === 'active');

    console.log(`📊 Tracking usage for ${activeUsers.length} users...`);

    let usersProcessed = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const user of activeUsers) {
      try {
        // Track storage usage
        await trackStorageUsage(user.id, periodStart, periodEnd);

        // Track AI usage (if not already tracked in real-time)
        await trackAIUsage(user.id, periodStart, periodEnd);

        usersProcessed++;
      } catch (error: any) {
        console.error(`❌ Error tracking usage for user ${user.id}:`, error);
        errors.push({
          userId: user.id,
          error: error.message || 'Unknown error',
        });
      }
    }

    console.log(`✅ Usage tracking completed!`);
    console.log(`   Processed: ${usersProcessed} users`);
    console.log(`   Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      usersProcessed,
      errors: errors.length,
      errorDetails: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error: any) {
    console.error('❌ Usage tracking cron job failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track usage' },
      { status: 500 }
    );
  }
}

/**
 * Track storage usage for a user
 */
async function trackStorageUsage(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  // Get user's email accounts
  const accounts = await db.select()
    .from(emailAccounts)
    .where(eq(emailAccounts.userId, userId));

  let totalStorageBytes = 0;
  let attachmentsBytes = 0;
  let emailsBytes = 0;

  for (const account of accounts) {
    // Sum up storage from account
    totalStorageBytes += Number(account.storageUsed || 0);

    // Calculate email storage (rough estimate: 50KB average per email)
    const emailCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(emails)
      .where(eq(emails.accountId, account.id));

    const emailStorageEstimate = (emailCount[0]?.count || 0) * 50 * 1024; // 50KB per email
    emailsBytes += emailStorageEstimate;

    // Attachments are part of totalStorageBytes, so calculate as difference
    attachmentsBytes = totalStorageBytes - emailsBytes;
  }

  // Determine included GB based on subscription tier
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  let includedGb = 50; // Default for free tier
  if (user?.subscriptionTier === 'starter') includedGb = 100;
  if (user?.subscriptionTier === 'pro') includedGb = 500;
  if (user?.subscriptionTier === 'enterprise') includedGb = 2000;

  const includedBytes = includedGb * 1024 * 1024 * 1024;
  const overageBytes = Math.max(0, totalStorageBytes - includedBytes);
  const overageGb = overageBytes / (1024 * 1024 * 1024);
  const overageCost = overageGb * 0.10; // $0.10 per GB

  // Check if record already exists for this period
  const existing = await db.query.storageUsage.findFirst({
    where: (storage: any, { and, eq, gte, lte }: any) =>
      and(
        eq(storage.userId, userId),
        gte(storage.periodStart, periodStart),
        lte(storage.periodEnd, periodEnd)
      ),
  });

  if (existing) {
    // Update existing record
    await db.update(storageUsage)
      .set({
        totalBytes: totalStorageBytes,
        storageUsed: totalStorageBytes,
        attachmentsBytes,
        emailsBytes,
        otherBytes: totalStorageBytes - attachmentsBytes - emailsBytes,
        includedGb: includedGb.toString(),
        overageGb: overageGb.toFixed(4),
        overageCostUsd: overageCost.toFixed(2),
        snapshotDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(storageUsage.id, existing.id));
  } else {
    // Insert new record
    await db.insert(storageUsage).values({
      userId,
      organizationId: user?.organizationId || null,
      totalBytes: totalStorageBytes,
      storageUsed: totalStorageBytes,
      attachmentsBytes,
      emailsBytes,
      otherBytes: totalStorageBytes - attachmentsBytes - emailsBytes,
      periodStart,
      periodEnd,
      includedGb: includedGb.toString(),
      overageGb: overageGb.toFixed(4),
      overageCostUsd: overageCost.toFixed(2),
      snapshotDate: new Date(),
    });
  }

  console.log(`   📦 Storage tracked for user ${userId}: ${(totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`);
}

/**
 * Track AI usage for a user
 * This consolidates any AI usage that wasn't tracked in real-time
 */
async function trackAIUsage(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  // Get existing AI usage records for this period
  const existing = await db.select()
    .from(aiUsage)
    .where(
      and(
        eq(aiUsage.userId, userId),
        gte(aiUsage.periodStart, periodStart),
        lte(aiUsage.periodEnd, periodEnd)
      )
    );

  // Calculate total requests and costs
  const totalRequests = existing.reduce((sum, record) => sum + (record.requestCount || 0), 0);
  const totalCost = existing.reduce((sum, record) => sum + parseFloat(record.totalCostUsd || '0'), 0);

  // Determine included requests based on subscription tier
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  let includedRequests = 100; // Default for free tier
  if (user?.subscriptionTier === 'starter') includedRequests = 1000;
  if (user?.subscriptionTier === 'pro') includedRequests = 10000;
  if (user?.subscriptionTier === 'enterprise') includedRequests = 100000;

  const overageRequests = Math.max(0, totalRequests - includedRequests);
  const overageCost = overageRequests * 0.001; // $0.001 per request

  // Update total cost if there's overage
  if (overageRequests > 0 && totalCost < overageCost) {
    // This would typically be handled in real-time, but we update here for consistency
    console.log(`   🤖 AI overage detected for user ${userId}: ${overageRequests} requests`);
  }

  console.log(`   🤖 AI usage tracked for user ${userId}: ${totalRequests} requests ($${totalCost.toFixed(2)})`);
}
