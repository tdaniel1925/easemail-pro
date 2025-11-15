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
import { z } from 'zod';

// Input validation schemas to prevent SQL injection
const accountIdSchema = z.string().uuid('Invalid account ID format');
const folderNameSchema = z.string().min(1).max(255).regex(/^[a-zA-Z0-9_\-\/\s]+$/, 'Invalid folder name format');

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
    // ✅ SECURITY: Validate input to prevent SQL injection
    const validatedAccountId = accountIdSchema.parse(accountId);

    // Validate account exists
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, validatedAccountId),
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
    // ✅ SECURITY: Using validated accountId in parameterized query
    const rawResult = await db.execute<{ folder: string; totalCount: number; unreadCount: number }>(sql`
      SELECT
        COALESCE(TRIM(BOTH '"' FROM folder_name::text), 'inbox') as folder,
        COUNT(DISTINCT email_id)::int as "totalCount",
        COUNT(DISTINCT email_id) FILTER (WHERE is_read = false)::int as "unreadCount"
      FROM (
        SELECT
          e.id as email_id,
          e.is_read,
          e.folder as folder_name
        FROM emails e
        WHERE
          e.account_id = ${validatedAccountId}
          AND e.is_trashed = false
          AND e.is_archived = false
          AND e.folder IS NOT NULL
          AND e.folder != ''

        UNION ALL

        SELECT
          e.id as email_id,
          e.is_read,
          folder_elem as folder_name
        FROM emails e
        CROSS JOIN LATERAL jsonb_array_elements_text(
          CASE
            WHEN e.folders IS NOT NULL AND jsonb_array_length(e.folders) > 0
            THEN e.folders
            ELSE '[]'::jsonb
          END
        ) AS folder_elem
        WHERE
          e.account_id = ${validatedAccountId}
          AND e.is_trashed = false
          AND e.is_archived = false
          AND folder_elem IS NOT NULL
          AND folder_elem != ''
      ) AS expanded_folders
      WHERE folder_name IS NOT NULL AND folder_name != ''
      GROUP BY folder_name
      ORDER BY folder_name
    `);

    // Drizzle's execute returns an array directly, not wrapped in .rows
    const result = Array.isArray(rawResult) ? rawResult : [];

    // Get local draft count (stored in email_drafts table, not emails table)
    // ✅ SECURITY: Using validated accountId
    const draftCountResult = await db.execute<{ count: number }>(sql`
      SELECT COUNT(*)::int as count
      FROM email_drafts
      WHERE account_id = ${validatedAccountId}
    `);
    const draftCount = Array.isArray(draftCountResult) && draftCountResult.length > 0
      ? Number(draftCountResult[0].count)
      : 0;

    // Add drafts folder to the result
    const countsWithDrafts = result.map(row => ({
      folder: row.folder || 'inbox',
      totalCount: Number(row.totalCount) || 0,
      unreadCount: Number(row.unreadCount) || 0,
    }));

    // Add or update drafts folder count
    const draftsIndex = countsWithDrafts.findIndex(c => c.folder.toLowerCase() === 'drafts');
    if (draftsIndex >= 0) {
      // Drafts folder exists from provider - add local drafts to it
      countsWithDrafts[draftsIndex].totalCount += draftCount;
    } else if (draftCount > 0) {
      // No drafts folder from provider - create one with local drafts
      countsWithDrafts.push({
        folder: 'drafts',
        totalCount: draftCount,
        unreadCount: 0, // Drafts are always "read"
      });
    }

    console.log(`📊 Calculated folder counts for account ${validatedAccountId} (${draftCount} local drafts):`, countsWithDrafts);

    return {
      success: true,
      counts: countsWithDrafts,
    };
  } catch (error) {
    console.error('❌ Failed to get folder counts:', error);
    // ✅ SECURITY: Don't leak internal error details to caller
    if (error instanceof z.ZodError) {
      return {
        success: false,
        counts: [],
        error: 'Invalid account ID format',
      };
    }
    return {
      success: false,
      counts: [],
      error: 'Failed to retrieve folder counts',
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
    // ✅ SECURITY: Validate inputs to prevent SQL injection
    const validatedAccountId = accountIdSchema.parse(accountId);
    const validatedFolderName = folderNameSchema.parse(folderName);

    // ✅ SECURITY: Check both folder field AND folders array for the folder name
    const rawResult = await db.execute<{ totalCount: number; unreadCount: number }>(sql`
      SELECT
        COUNT(DISTINCT e.id)::int as "totalCount",
        COUNT(DISTINCT e.id) FILTER (WHERE e.is_read = false)::int as "unreadCount"
      FROM emails e
      WHERE
        e.account_id = ${validatedAccountId}
        AND e.is_trashed = false
        AND e.is_archived = false
        AND (
          LOWER(e.folder) = LOWER(${validatedFolderName})
          OR e.folders ? ${validatedFolderName}
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(e.folders) as folder_elem
            WHERE LOWER(folder_elem) = LOWER(${validatedFolderName})
          )
        )
    `);

    // Drizzle's execute returns an array directly, not wrapped in .rows
    const result = Array.isArray(rawResult) ? rawResult : [];

    if (result.length === 0) {
      return { totalCount: 0, unreadCount: 0 };
    }

    return {
      totalCount: Number(result[0].totalCount) || 0,
      unreadCount: Number(result[0].unreadCount) || 0,
    };
  } catch (error) {
    // ✅ SECURITY: Log error but don't expose details
    console.error(`❌ Failed to get count for folder:`, error);
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
    // ✅ SECURITY: Validate input to prevent SQL injection
    const validatedAccountId = accountIdSchema.parse(accountId);

    const result = await db
      .select({
        totalCount: sql<number>`COUNT(*)::int`,
        unreadCount: sql<number>`COUNT(*) FILTER (WHERE ${emails.isRead} = false)::int`,
      })
      .from(emails)
      .where(
        and(
          eq(emails.accountId, validatedAccountId),
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

