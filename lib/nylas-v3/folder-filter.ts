/**
 * Folder Filter Utilities for Server-Side Message Filtering
 *
 * Provides efficient server-side folder filtering for Nylas API.
 * This reduces bandwidth by excluding folders at the API level
 * instead of fetching all messages and filtering client-side.
 *
 * Usage:
 *   const excludeIds = await getExcludeFolderIds(grantId);
 *   const messages = await fetchMessages({ grantId, excludeFolders: excludeIds });
 */

import { getNylasClient } from './config';
import { cache } from '@/lib/redis/client';

// Cache key prefix for folder IDs
const FOLDER_CACHE_PREFIX = 'easemail:folders:';
const FOLDER_CACHE_TTL = 5 * 60; // 5 minutes

// Standard folders to exclude when fetching inbox messages
const EXCLUDE_FOLDER_TYPES = [
  'sent',
  'drafts',
  'trash',
  'spam',
  'junk',
  'deleted',
  'archive',
  'all', // Gmail's "All Mail"
];

// Folder name patterns to exclude (case-insensitive matching)
const EXCLUDE_FOLDER_PATTERNS = [
  /^sent/i,
  /sent items$/i,
  /sent mail$/i,
  /sent messages$/i,
  /^drafts?$/i,
  /^trash$/i,
  /deleted items$/i,
  /deleted messages$/i,
  /^spam$/i,
  /^junk$/i,
  /junk mail$/i,
  /^archive$/i,
  /all mail$/i,
  /\[gmail\]\/all mail/i,
  /\[gmail\]\/spam/i,
  /\[gmail\]\/trash/i,
  /\[gmail\]\/drafts/i,
  /\[gmail\]\/sent mail/i,
];

export interface FolderInfo {
  id: string;
  name: string;
  type?: string;
}

/**
 * Fetch all folders for an account and cache them
 */
export async function getFolders(grantId: string): Promise<FolderInfo[]> {
  const cacheKey = `${FOLDER_CACHE_PREFIX}${grantId}`;

  // Try cache first
  try {
    const cached = await cache.get<FolderInfo[]>(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (error) {
    console.warn('[FolderFilter] Cache read failed:', error);
  }

  // Fetch from Nylas
  const nylas = getNylasClient();

  try {
    const response = await nylas.folders.list({
      identifier: grantId,
    });

    const folders: FolderInfo[] = response.data.map((folder: any) => ({
      id: folder.id,
      name: folder.name || '',
      type: folder.type || undefined,
    }));

    // Cache for 5 minutes
    try {
      await cache.set(cacheKey, folders, FOLDER_CACHE_TTL);
    } catch (error) {
      console.warn('[FolderFilter] Cache write failed:', error);
    }

    return folders;
  } catch (error) {
    console.error('[FolderFilter] Failed to fetch folders:', error);
    return [];
  }
}

/**
 * Check if a folder should be excluded based on name and type
 */
function shouldExcludeFolder(folder: FolderInfo): boolean {
  // Check by type first (most reliable)
  if (folder.type && EXCLUDE_FOLDER_TYPES.includes(folder.type.toLowerCase())) {
    return true;
  }

  // Check by name patterns
  const folderName = folder.name.toLowerCase();

  for (const pattern of EXCLUDE_FOLDER_PATTERNS) {
    if (pattern.test(folder.name)) {
      return true;
    }
  }

  // Additional name-based checks
  if (
    folderName.includes('sent') ||
    folderName.includes('draft') ||
    folderName.includes('trash') ||
    folderName.includes('spam') ||
    folderName.includes('junk') ||
    folderName.includes('deleted')
  ) {
    return true;
  }

  return false;
}

/**
 * Get folder IDs to exclude when fetching inbox/all messages
 * This enables efficient server-side filtering
 */
export async function getExcludeFolderIds(grantId: string): Promise<string[]> {
  const folders = await getFolders(grantId);

  const excludeIds = folders
    .filter(shouldExcludeFolder)
    .map((folder) => folder.id);

  console.log(`[FolderFilter] Excluding ${excludeIds.length} folders for server-side filtering`);

  return excludeIds;
}

/**
 * Get the inbox folder ID (for explicit inbox filtering)
 */
export async function getInboxFolderId(grantId: string): Promise<string | null> {
  const folders = await getFolders(grantId);

  const inbox = folders.find(
    (folder) =>
      folder.type === 'inbox' ||
      folder.name.toLowerCase() === 'inbox'
  );

  return inbox?.id || null;
}

/**
 * Get folder ID by canonical name
 */
export async function getFolderIdByName(
  grantId: string,
  folderName: string
): Promise<string | null> {
  const folders = await getFolders(grantId);
  const normalizedName = folderName.toLowerCase();

  // Try exact type match first
  let folder = folders.find((f) => f.type?.toLowerCase() === normalizedName);

  // Try name match
  if (!folder) {
    folder = folders.find((f) => f.name.toLowerCase() === normalizedName);
  }

  // Try partial name match
  if (!folder) {
    folder = folders.find((f) => f.name.toLowerCase().includes(normalizedName));
  }

  return folder?.id || null;
}

/**
 * Clear folder cache for an account (call after folder changes)
 */
export async function clearFolderCache(grantId: string): Promise<void> {
  const cacheKey = `${FOLDER_CACHE_PREFIX}${grantId}`;

  try {
    await cache.del(cacheKey);
    console.log(`[FolderFilter] Cache cleared for ${grantId}`);
  } catch (error) {
    console.warn('[FolderFilter] Failed to clear cache:', error);
  }
}
