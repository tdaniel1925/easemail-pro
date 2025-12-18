/**
 * Nylas v3 Folders API
 * Folder management and synchronization
 */

import { getNylasClient } from './config';
import { retryWithBackoff, handleNylasError } from './errors';

export interface NylasFolder {
  id: string;
  name: string;
  parentId?: string | null;
  unreadCount?: number;
  totalCount?: number;
  attributes?: string[];
}

/**
 * Fetch all folders for a grant
 * Nylas v3 automatically flattens Microsoft/IMAP hierarchies
 */
export async function fetchFolders(grantId: string): Promise<NylasFolder[]> {
  const nylas = getNylasClient();

  try {
    console.log(`📁 Fetching folders for grant ${grantId.substring(0, 8)}...`);

    const response = await retryWithBackoff(
      async () =>
        await nylas.folders.list({
          identifier: grantId,
        }),
      {
        maxRetries: 3,
        onRetry: (attempt, error) => {
          console.log(`⏳ Retry ${attempt}/3 for folder fetch: ${error.message}`);
        },
      }
    );

    const folders = response.data.map((folder: any) => ({
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId || null,
      unreadCount: folder.unreadCount || 0,
      totalCount: folder.totalCount || 0,
      attributes: folder.attributes || [],
    }));

    console.log(`✅ Fetched ${folders.length} folders`);
    return folders;
  } catch (error) {
    console.error('❌ Folder fetch error:', error);
    throw handleNylasError(error);
  }
}

/**
 * Fetch a single folder by ID
 */
export async function fetchFolder(grantId: string, folderId: string): Promise<NylasFolder> {
  const nylas = getNylasClient();

  try {
    const folder = await nylas.folders.find({
      identifier: grantId,
      folderId,
    });

    return {
      id: folder.data.id,
      name: folder.data.name,
      parentId: folder.data.parentId || null,
      unreadCount: folder.data.unreadCount || 0,
      totalCount: folder.data.totalCount || 0,
      attributes: folder.data.attributes || [],
    };
  } catch (error) {
    console.error('❌ Single folder fetch error:', error);
    throw handleNylasError(error);
  }
}

/**
 * Determine folder type based on name and attributes
 */
export function determineFolderType(folderName: string | null | undefined, attributes?: string[]): string {
  // Handle null/undefined folder names
  if (!folderName) {
    return 'custom';
  }

  const lowerName = folderName.toLowerCase();

  // Check attributes first (most reliable)
  if (attributes) {
    if (attributes.includes('\\Inbox')) return 'inbox';
    if (attributes.includes('\\Sent')) return 'sent';
    if (attributes.includes('\\Drafts')) return 'drafts';
    if (attributes.includes('\\Trash')) return 'trash';
    if (attributes.includes('\\Junk')) return 'spam';
    if (attributes.includes('\\Archive')) return 'archive';
    if (attributes.includes('\\All')) return 'all';
  }

  // Fall back to name matching
  if (lowerName.includes('inbox')) return 'inbox';
  if (lowerName.includes('sent')) return 'sent';
  if (lowerName.includes('draft')) return 'drafts';
  if (lowerName.includes('trash') || lowerName.includes('deleted')) return 'trash';
  if (lowerName.includes('spam') || lowerName.includes('junk')) return 'spam';
  if (lowerName.includes('archive')) return 'archive';
  if (lowerName.includes('all') || lowerName === '[gmail]/all mail') return 'all';
  if (lowerName.includes('starred') || lowerName.includes('important')) return 'starred';

  return 'custom';
}

/**
 * Build hierarchical folder structure for UI display
 */
export function buildFolderHierarchy(folders: NylasFolder[]): NylasFolder[] {
  const folderMap = new Map<string, NylasFolder & { children: NylasFolder[] }>();
  const rootFolders: (NylasFolder & { children: NylasFolder[] })[] = [];

  // Create map with children array
  folders.forEach(folder => {
    folderMap.set(folder.id, { ...folder, children: [] });
  });

  // Build hierarchy
  folders.forEach(folder => {
    const currentFolder = folderMap.get(folder.id)!;

    if (folder.parentId) {
      const parent = folderMap.get(folder.parentId);
      if (parent) {
        parent.children.push(currentFolder);
      } else {
        // Parent not found, treat as root
        rootFolders.push(currentFolder);
      }
    } else {
      rootFolders.push(currentFolder);
    }
  });

  return rootFolders;
}

/**
 * Sort folders by type (inbox, sent, etc. first, then custom)
 */
export function sortFolders(folders: NylasFolder[]): NylasFolder[] {
  const folderOrder = ['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive', 'starred', 'all'];

  return folders.sort((a, b) => {
    const aType = determineFolderType(a.name, a.attributes);
    const bType = determineFolderType(b.name, b.attributes);

    const aIndex = folderOrder.indexOf(aType);
    const bIndex = folderOrder.indexOf(bType);

    // Both are standard folders
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // a is standard, b is custom
    if (aIndex !== -1) return -1;

    // b is standard, a is custom
    if (bIndex !== -1) return 1;

    // Both are custom, sort alphabetically (with null safety)
    const aName = a.name || '';
    const bName = b.name || '';
    return aName.localeCompare(bName);
  });
}

/**
 * Create a new folder
 */
export async function createFolder(grantId: string, name: string, parentId?: string) {
  const nylas = getNylasClient();

  try {
    const folder = await nylas.folders.create({
      identifier: grantId,
      requestBody: {
        name,
        parentId: parentId || undefined,
      },
    });

    console.log(`✅ Created folder: ${name}`);
    return folder.data;
  } catch (error) {
    console.error('❌ Folder create error:', error);
    throw handleNylasError(error);
  }
}

/**
 * Update a folder (rename)
 */
export async function updateFolder(grantId: string, folderId: string, name: string) {
  const nylas = getNylasClient();

  try {
    const folder = await nylas.folders.update({
      identifier: grantId,
      folderId,
      requestBody: { name },
    });

    console.log(`✅ Updated folder: ${folderId} -> ${name}`);
    return folder.data;
  } catch (error) {
    console.error('❌ Folder update error:', error);
    throw handleNylasError(error);
  }
}

/**
 * Delete a folder
 */
export async function deleteFolder(grantId: string, folderId: string) {
  const nylas = getNylasClient();

  try {
    await nylas.folders.destroy({
      identifier: grantId,
      folderId,
    });

    console.log(`✅ Deleted folder: ${folderId}`);
  } catch (error) {
    console.error('❌ Folder delete error:', error);
    throw handleNylasError(error);
  }
}
