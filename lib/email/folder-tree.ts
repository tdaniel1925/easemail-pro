/**
 * Folder Tree Utilities
 * 
 * Handles folder hierarchy and nesting for Outlook-style folder organization
 */

export interface FolderNode {
  id: string;
  name: string;
  displayName: string;
  folderType: string;
  parentFolderId: string | null;
  fullPath: string;
  unreadCount: number;
  totalCount?: number;
  children: FolderNode[];
  depth: number;
}

/**
 * Build folder tree from flat list
 * 
 * Converts flat folder array into hierarchical tree structure
 * Uses parentFolderId to determine relationships
 */
export function buildFolderTree(folders: any[]): FolderNode[] {
  // Create a map for quick lookup
  const folderMap = new Map<string, FolderNode>();
  const rootFolders: FolderNode[] = [];

  // First pass: Create all nodes
  folders.forEach(folder => {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
      depth: 0,
    });
  });

  // Second pass: Build tree structure
  folders.forEach(folder => {
    const node = folderMap.get(folder.id)!;
    
    if (folder.parentFolderId && folderMap.has(folder.parentFolderId)) {
      // Has parent - add as child
      const parent = folderMap.get(folder.parentFolderId)!;
      parent.children.push(node);
      node.depth = parent.depth + 1;
    } else {
      // No parent - root level
      rootFolders.push(node);
    }
  });

  // Sort children alphabetically at each level
  const sortChildren = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.displayName.localeCompare(b.displayName));
    nodes.forEach(node => {
      if (node.children.length > 0) {
        sortChildren(node.children);
      }
    });
  };

  sortChildren(rootFolders);

  return rootFolders;
}

/**
 * Flatten folder tree back to array (with depth info)
 * 
 * Useful for rendering a flat list with indentation
 */
export function flattenFolderTree(tree: FolderNode[]): FolderNode[] {
  const result: FolderNode[] = [];

  const traverse = (nodes: FolderNode[]) => {
    nodes.forEach(node => {
      result.push(node);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    });
  };

  traverse(tree);
  return result;
}

/**
 * Get folder path as breadcrumb array
 * 
 * Example: ['Projects', '2024', 'Q1']
 */
export function getFolderPath(folderId: string, folders: any[]): string[] {
  const path: string[] = [];
  let currentId: string | null = folderId;

  const folderMap = new Map(folders.map(f => [f.id, f]));

  while (currentId) {
    const folder = folderMap.get(currentId);
    if (!folder) break;
    
    path.unshift(folder.displayName || folder.name);
    currentId = folder.parentFolderId;
  }

  return path;
}

/**
 * Search folders by name (fuzzy)
 * 
 * Returns folders matching search query
 */
export function searchFolders(folders: any[], query: string): any[] {
  const lowerQuery = query.toLowerCase();
  
  return folders.filter(folder => {
    const displayName = (folder.displayName || folder.name).toLowerCase();
    const folderType = (folder.folderType || '').toLowerCase();
    const fullPath = (folder.fullPath || '').toLowerCase();
    
    return (
      displayName.includes(lowerQuery) ||
      folderType.includes(lowerQuery) ||
      fullPath.includes(lowerQuery)
    );
  });
}

/**
 * Get folder by path
 * 
 * Example: 'Projects/2024/Q1' -> folder object
 */
export function getFolderByPath(folders: any[], path: string): any | null {
  const parts = path.split('/').map(p => p.trim());
  
  let current: any[] = folders.filter(f => !f.parentFolderId);
  
  for (const part of parts) {
    const found = current.find(f => 
      (f.displayName || f.name).toLowerCase() === part.toLowerCase()
    );
    
    if (!found) return null;
    
    if (parts.indexOf(part) === parts.length - 1) {
      return found;
    }
    
    current = folders.filter(f => f.parentFolderId === found.id);
  }
  
  return null;
}

