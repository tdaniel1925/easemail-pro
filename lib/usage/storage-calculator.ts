/**
 * Storage Usage Calculator
 * Calculates storage usage and overage costs
 */

import { db } from '@/lib/db/drizzle';
import { storageUsage, emails, attachments, users, emailAccounts } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, sum } from 'drizzle-orm';

interface StorageBreakdown {
  totalBytes: number;
  totalGb: number;
  emailsBytes: number;
  attachmentsBytes: number;
  includedGb: number;
  overageGb: number;
  overageCost: number;
}

/**
 * Calculate storage usage for a user
 */
export async function calculateUserStorage(userId: string): Promise<StorageBreakdown> {
  // Calculate email storage - join through emailAccounts
  const emailsResult = await db
    .select({
      totalSize: sql<number>`COALESCE(SUM(LENGTH(COALESCE(${emails.bodyText}, '')) + LENGTH(COALESCE(${emails.bodyHtml}, ''))), 0)::bigint`,
    })
    .from(emails)
    .innerJoin(emailAccounts, eq(emails.accountId, emailAccounts.id))
    .where(eq(emailAccounts.userId, userId));
  
  const emailsBytes = Number(emailsResult[0]?.totalSize || 0);
  
  // Calculate attachment storage
  const attachmentsResult = await db
    .select({
      totalSize: sql<number>`COALESCE(SUM(file_size_bytes), 0)::bigint`,
    })
    .from(attachments)
    .where(eq(attachments.userId, userId));
  
  const attachmentsBytes = Number(attachmentsResult[0]?.totalSize || 0);
  
  // Total
  const totalBytes = emailsBytes + attachmentsBytes;
  const totalGb = totalBytes / (1024 ** 3); // Convert to GB
  
  // Calculate overage
  const includedGb = 50; // Default: 50 GB per user (TODO: Get from plan)
  const overageGb = Math.max(0, totalGb - includedGb);
  const overageCostPerGb = 0.10; // $0.10 per GB
  const overageCost = overageGb * overageCostPerGb;
  
  return {
    totalBytes,
    totalGb,
    emailsBytes,
    attachmentsBytes,
    includedGb,
    overageGb,
    overageCost,
  };
}

/**
 * Save storage snapshot to database
 */
export async function saveStorageSnapshot(userId: string, organizationId?: string) {
  const breakdown = await calculateUserStorage(userId);
  
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  // Check if snapshot exists for this period
  const existing = await db.query.storageUsage.findFirst({
    where: and(
      eq(storageUsage.userId, userId),
      gte(storageUsage.periodStart, periodStart),
      lte(storageUsage.periodEnd, periodEnd)
    ),
  });
  
  if (existing) {
    // Update existing
    await db.update(storageUsage)
      .set({
        totalBytes: breakdown.totalBytes,
        emailsBytes: breakdown.emailsBytes,
        attachmentsBytes: breakdown.attachmentsBytes,
        overageGb: breakdown.overageGb.toFixed(2),
        overageCostUsd: breakdown.overageCost.toFixed(2),
        snapshotDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(storageUsage.id, existing.id));
  } else {
    // Create new
    await db.insert(storageUsage).values({
      userId,
      organizationId,
      totalBytes: breakdown.totalBytes,
      emailsBytes: breakdown.emailsBytes,
      attachmentsBytes: breakdown.attachmentsBytes,
      otherBytes: 0,
      periodStart,
      periodEnd,
      includedGb: breakdown.includedGb.toString(),
      overageGb: breakdown.overageGb.toFixed(2),
      overageCostUsd: breakdown.overageCost.toFixed(2),
      snapshotDate: new Date(),
    });
  }
  
  return breakdown;
}

/**
 * Get storage usage for a period
 */
export async function getStorageUsage(
  userId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const record = await db.query.storageUsage.findFirst({
    where: and(
      eq(storageUsage.userId, userId),
      gte(storageUsage.periodStart, periodStart),
      lte(storageUsage.periodEnd, periodEnd)
    ),
  });
  
  if (!record) {
    // If no snapshot, calculate current
    return calculateUserStorage(userId);
  }
  
  return {
    totalBytes: record.totalBytes || 0,
    totalGb: Number(record.totalBytes || 0) / (1024 ** 3),
    emailsBytes: record.emailsBytes || 0,
    attachmentsBytes: record.attachmentsBytes || 0,
    includedGb: parseFloat(record.includedGb || '50'),
    overageGb: parseFloat(record.overageGb || '0'),
    overageCost: parseFloat(record.overageCostUsd || '0'),
  };
}

/**
 * Get organization storage usage (all users)
 */
export async function getOrganizationStorage(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date
) {
  // Get all users in org
  const orgUsers = await db.query.users.findMany({
    where: eq(users.organizationId, organizationId),
  });
  
  // Get storage for each user
  const userStoragePromises = orgUsers.map(user => 
    getStorageUsage(user.id, periodStart, periodEnd)
  );
  
  const userStorage = await Promise.all(userStoragePromises);
  
  // Aggregate
  const total = {
    totalBytes: 0,
    totalGb: 0,
    emailsBytes: 0,
    attachmentsBytes: 0,
    overageGb: 0,
    overageCost: 0,
  };
  
  const byUser: Array<{
    userId: string;
    storage: StorageBreakdown;
  }> = [];
  
  userStorage.forEach((storage, index) => {
    total.totalBytes += storage.totalBytes || 0;
    total.totalGb += storage.totalGb || 0;
    total.emailsBytes += storage.emailsBytes || 0;
    total.attachmentsBytes += storage.attachmentsBytes || 0;
    total.overageGb += storage.overageGb || 0;
    total.overageCost += storage.overageCost || 0;
    
    byUser.push({
      userId: orgUsers[index].id,
      storage,
    });
  });
  
  return {
    total,
    byUser,
    userCount: orgUsers.length,
  };
}

/**
 * Get current month storage usage
 */
export async function getCurrentMonthStorage(userId: string) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  return getStorageUsage(userId, periodStart, periodEnd);
}

/**
 * Calculate storage growth trend (last 6 months)
 */
export async function getStorageGrowthTrend(userId: string) {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const snapshots = await db.query.storageUsage.findMany({
    where: and(
      eq(storageUsage.userId, userId),
      gte(storageUsage.snapshotDate, sixMonthsAgo)
    ),
    orderBy: (su, { asc }) => [asc(su.snapshotDate)],
  });
  
  return snapshots.map(snapshot => ({
    date: snapshot.snapshotDate,
    totalGb: Number(snapshot.totalBytes) / (1024 ** 3),
    overageGb: parseFloat(snapshot.overageGb || '0'),
    cost: parseFloat(snapshot.overageCostUsd || '0'),
  }));
}

