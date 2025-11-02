/**
 * Real-Time Folder Counts
 * 
 * Calculates folder counts from local database instead of relying on Nylas API.
 * This provides:
 * - Real-time updates (no stale data)
 * - Instant feedback when emails are read/moved/deleted
 * - Works offline
 * - More reliable than synced counts
 * 
 * Like Superhuman: Counts update immediately on user actions
 */

import { db } from '@/lib/db/drizzle';
import { emails, emailAccounts } from '@/lib/db/schema';
import { eq, sql, and } from 'drizzle-orm';

export interface FolderCount {
  folder: string;
  totalCount: number;
  unreadCount: number;
}

export interface FolderCountsResult {
  success: boolean;
  counts: FolderCount[];
  error?: string;
}

/**
 * Get real-time folder counts for an account
 * 
 * @param accountId - The email account ID
 * @returns Object with folder counts (total and unread)
 */
export async function getFolderCounts(accountId: string): Promise<FolderCountsResult> {
  try {
    // Validate account exists
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return {
        success: false,
        counts: [],
        error: 'Account not found',
      };
    }

    // Query folder counts using SQL aggregation
    // This is MUCH faster than counting in JavaScript
    const result = await db
      .select({
        folder: emails.folder,
        totalCount: sql<number>`COUNT(*)::int`,
        unreadCount: sql<number>`COUNT(*) FILTER (WHERE ${emails.isRead} = false)::int`,
      })
      .from(emails)
      .where(
        and(
          eq(emails.accountId, accountId),
          eq(emails.isTrashed, false), // Exclude trashed emails
          eq(emails.isArchived, false) // Exclude archived emails
        )
      )
      .groupBy(emails.folder);

    console.log(`📊 Calculated folder counts for account ${accountId}:`, result);

    return {
      success: true,
      counts: result.map(row => ({
        folder: row.folder || 'inbox',
        totalCount: Number(row.totalCount) || 0,
        unreadCount: Number(row.unreadCount) || 0,
      })),
    };
  } catch (error) {
    console.error('❌ Failed to get folder counts:', error);
    return {
      success: false,
      counts: [],
      error: (error as Error).message,
    };
  }
}

/**
 * Get count for a specific folder
 * 
 * @param accountId - The email account ID
 * @param folderName - The folder name (e.g., 'inbox', 'sent')
 * @returns Total and unread counts for that folder
 */
export async function getFolderCount(
  accountId: string,
  folderName: string
): Promise<{ totalCount: number; unreadCount: number }> {
  try {
    const result = await db
      .select({
        totalCount: sql<number>`COUNT(*)::int`,
        unreadCount: sql<number>`COUNT(*) FILTER (WHERE ${emails.isRead} = false)::int`,
      })
      .from(emails)
      .where(
        and(
          eq(emails.accountId, accountId),
          sql`LOWER(${emails.folder}) = LOWER(${folderName})`, // Case-insensitive
          eq(emails.isTrashed, false),
          eq(emails.isArchived, false)
        )
      );

    if (result.length === 0) {
      return { totalCount: 0, unreadCount: 0 };
    }

    return {
      totalCount: Number(result[0].totalCount) || 0,
      unreadCount: Number(result[0].unreadCount) || 0,
    };
  } catch (error) {
    console.error(`❌ Failed to get count for folder ${folderName}:`, error);
    return { totalCount: 0, unreadCount: 0 };
  }
}

/**
 * Get inbox count (special case - includes all non-trashed, non-archived emails)
 * 
 * @param accountId - The email account ID
 * @returns Total and unread counts for inbox
 */
export async function getInboxCount(accountId: string): Promise<{ totalCount: number; unreadCount: number }> {
  try {
    const result = await db
      .select({
        totalCount: sql<number>`COUNT(*)::int`,
        unreadCount: sql<number>`COUNT(*) FILTER (WHERE ${emails.isRead} = false)::int`,
      })
      .from(emails)
      .where(
        and(
          eq(emails.accountId, accountId),
          eq(emails.isTrashed, false),
          eq(emails.isArchived, false)
        )
      );

    if (result.length === 0) {
      return { totalCount: 0, unreadCount: 0 };
    }

    return {
      totalCount: Number(result[0].totalCount) || 0,
      unreadCount: Number(result[0].unreadCount) || 0,
    };
  } catch (error) {
    console.error('❌ Failed to get inbox count:', error);
    return { totalCount: 0, unreadCount: 0 };
  }
}

/**
 * Refresh folder counts after an action (mark read, move, delete)
 * This should be called after any email mutation to keep counts fresh
 * 
 * @param accountId - The email account ID
 * @returns Updated folder counts
 */
export async function refreshFolderCounts(accountId: string): Promise<FolderCountsResult> {
  console.log('🔄 Refreshing folder counts for account:', accountId);
  return await getFolderCounts(accountId);
}

/**
 * Get counts for multiple accounts at once (for account switcher)
 * 
 * @param accountIds - Array of account IDs
 * @returns Map of accountId -> folder counts
 */
export async function getMultiAccountCounts(
  accountIds: string[]
): Promise<Record<string, FolderCount[]>> {
  try {
    const results: Record<string, FolderCount[]> = {};

    // Fetch counts for all accounts in parallel
    const promises = accountIds.map(async (accountId) => {
      const result = await getFolderCounts(accountId);
      results[accountId] = result.success ? result.counts : [];
    });

    await Promise.all(promises);

    return results;
  } catch (error) {
    console.error('❌ Failed to get multi-account counts:', error);
    return {};
  }
}

