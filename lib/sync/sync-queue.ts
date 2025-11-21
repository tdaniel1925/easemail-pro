/**
 * Sync Queue Manager
 * Prevents too many accounts from syncing simultaneously to avoid rate limits
 */

import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq, inArray, or } from 'drizzle-orm';

const MAX_CONCURRENT_SYNCS = 5;
const activeSyncs = new Set<string>();

/**
 * Check if sync can start immediately or needs to be queued
 */
export async function canStartSync(accountId: string): Promise<boolean> {
  // Remove completed syncs from active set
  await cleanupActiveSyncs();

  // Check if we're under the limit
  if (activeSyncs.size < MAX_CONCURRENT_SYNCS) {
    activeSyncs.add(accountId);
    console.log(`✅ Sync queue: Starting sync for ${accountId} (${activeSyncs.size}/${MAX_CONCURRENT_SYNCS} active)`);
    return true;
  }

  console.log(`⏸️ Sync queue: Queueing ${accountId} (${activeSyncs.size}/${MAX_CONCURRENT_SYNCS} active)`);
  return false;
}

/**
 * Mark sync as completed and remove from active set
 */
export function completeSyncSlot(accountId: string): void {
  activeSyncs.delete(accountId);
  console.log(`✅ Sync queue: Released slot for ${accountId} (${activeSyncs.size}/${MAX_CONCURRENT_SYNCS} active)`);

  // Trigger processing of queued syncs
  processQueuedSyncs().catch(err => {
    console.error('Error processing queued syncs:', err);
  });
}

/**
 * Remove syncs that are no longer active from the tracking set
 */
async function cleanupActiveSyncs(): Promise<void> {
  if (activeSyncs.size === 0) return;

  try {
    const accountIds = Array.from(activeSyncs);

    // Query database to see which accounts are still actually syncing
    const accounts = await db.query.emailAccounts.findMany({
      where: inArray(emailAccounts.id, accountIds),
    });

    const stillSyncing = new Set(
      accounts
        .filter(acc => acc.syncStatus === 'syncing' || acc.syncStatus === 'background_syncing')
        .map(acc => acc.id)
    );

    // Remove accounts that are no longer syncing
    for (const accountId of accountIds) {
      if (!stillSyncing.has(accountId)) {
        activeSyncs.delete(accountId);
        console.log(`🧹 Sync queue: Cleaned up stale entry for ${accountId}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up active syncs:', error);
  }
}

/**
 * Process accounts waiting in queue
 */
async function processQueuedSyncs(): Promise<void> {
  try {
    // Find accounts with 'queued' status
    const queuedAccounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.syncStatus, 'queued'),
      limit: MAX_CONCURRENT_SYNCS - activeSyncs.size, // Only get as many as we have slots
    });

    if (queuedAccounts.length === 0) return;

    console.log(`🔄 Sync queue: Processing ${queuedAccounts.length} queued account(s)`);

    // Start syncing queued accounts
    for (const account of queuedAccounts) {
      if (activeSyncs.size >= MAX_CONCURRENT_SYNCS) break;

      // Mark as active
      activeSyncs.add(account.id);

      // Trigger background sync
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/sync/background`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: account.id }),
        });

        if (!response.ok) {
          console.error(`Failed to start queued sync for ${account.id}`);
          activeSyncs.delete(account.id);
        }
      } catch (error) {
        console.error(`Error starting queued sync for ${account.id}:`, error);
        activeSyncs.delete(account.id);
      }
    }
  } catch (error) {
    console.error('Error processing queued syncs:', error);
  }
}

/**
 * Get current queue statistics
 */
export async function getQueueStats(): Promise<{
  active: number;
  maxConcurrent: number;
  queued: number;
  availableSlots: number;
}> {
  await cleanupActiveSyncs();

  const queuedAccounts = await db.query.emailAccounts.findMany({
    where: eq(emailAccounts.syncStatus, 'queued'),
  });

  return {
    active: activeSyncs.size,
    maxConcurrent: MAX_CONCURRENT_SYNCS,
    queued: queuedAccounts.length,
    availableSlots: Math.max(0, MAX_CONCURRENT_SYNCS - activeSyncs.size),
  };
}
