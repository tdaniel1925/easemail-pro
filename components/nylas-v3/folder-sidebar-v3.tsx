/**
 * Folder Sidebar v3
 * Proper Nylas v3 folder display with real-time updates
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  FileText,
  Trash2,
  Archive,
  Folder,
  Star,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FolderSidebarV3Props {
  accountId: string;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string, folderName: string) => void;
}

interface FolderItem {
  id: string;
  name: string;
  parentId?: string | null;
  unreadCount?: number;
  totalCount?: number;
  attributes?: string[];
  children?: FolderItem[];
}

export function FolderSidebarV3({
  accountId,
  selectedFolderId,
  onFolderSelect,
}: FolderSidebarV3Props) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['inbox'])
  );

  useEffect(() => {
    if (accountId) {
      // Clear old folders immediately when account changes
      setFolders([]);
      setLoading(true);
      fetchFolders();
    }
  }, [accountId]);

  // Listen for draft updates and refresh counts (debounced to prevent flashing)
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout | null = null;

    const handleRefreshEmails = () => {
      // Debounce folder count refreshes to prevent red dot from flashing
      // when drafts are rapidly saved/deleted
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      refreshTimer = setTimeout(() => {
        console.log('[FolderSidebar] Refreshing folder counts after draft change...');
        fetchFolders();
      }, 2000); // Wait 2 seconds after last draft change before refreshing
    };

    window.addEventListener('refreshEmails', handleRefreshEmails);

    return () => {
      window.removeEventListener('refreshEmails', handleRefreshEmails);
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [accountId]);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch folders and counts in parallel
      const [foldersResponse, countsResponse] = await Promise.all([
        fetch(`/api/nylas-v3/folders?accountId=${accountId}&hierarchy=true`),
        fetch(`/api/nylas/folders/counts?accountId=${accountId}`)
      ]);

      if (!foldersResponse.ok) {
        throw new Error('Failed to fetch folders');
      }

      const foldersData = await foldersResponse.json();
      let fetchedFolders = foldersData.folders || [];

      // Merge in counts if available
      if (countsResponse.ok) {
        const countsData = await countsResponse.json();
        if (countsData.success && countsData.counts) {
          // Create a map of folder name -> counts
          const countsMap = new Map<string, { totalCount: number; unreadCount: number }>(
            countsData.counts.map((c: any) => [c.folder.toLowerCase(), { totalCount: c.totalCount, unreadCount: c.unreadCount }])
          );

          // Recursive function to update counts in folder tree
          const updateFolderCounts = (folder: FolderItem): FolderItem => {
            const folderCounts = countsMap.get(folder.name.toLowerCase());
            const updatedFolder: FolderItem = {
              ...folder,
              totalCount: folderCounts?.totalCount ?? folder.totalCount,
              unreadCount: folderCounts?.unreadCount ?? folder.unreadCount,
            };

            if (folder.children) {
              updatedFolder.children = folder.children.map(updateFolderCounts);
            }

            return updatedFolder;
          };

          fetchedFolders = fetchedFolders.map(updateFolderCounts);
        }
      }

      setFolders(fetchedFolders);
    } catch (err) {
      console.error('Error fetching folders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const getFolderIcon = (folder: FolderItem) => {
    const name = folder.name.toLowerCase();
    const attrs = folder.attributes || [];

    if (name.includes('inbox') || attrs.includes('\\Inbox')) return Mail;
    if (name.includes('sent') || attrs.includes('\\Sent')) return Send;
    if (name.includes('draft') || attrs.includes('\\Drafts')) return FileText;
    if (name.includes('trash') || attrs.includes('\\Trash')) return Trash2;
    if (name.includes('archive') || attrs.includes('\\Archive')) return Archive;
    if (name.includes('starred') || name.includes('important')) return Star;
    if (name.includes('spam') || name.includes('junk')) return AlertCircle;

    return Folder;
  };

  const toggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderFolder = (folder: FolderItem, level: number = 0) => {
    const Icon = getFolderIcon(folder);
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id}>
        <button
          onClick={() => onFolderSelect(folder.id, folder.name)}
          className={cn(
            'w-full flex items-center gap-1.5 px-2 py-1 text-xs transition-colors',
            'hover:bg-accent',
            isSelected && 'bg-primary text-primary-foreground font-medium'
          )}
          style={{ paddingLeft: `${8 + level * 12}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => toggleFolder(folder.id, e)}
              className="p-0.5 hover:bg-accent rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-2.5 w-2.5" />
              ) : (
                <ChevronRight className="h-2.5 w-2.5" />
              )}
            </button>
          )}

          <Icon className="h-3.5 w-3.5 flex-shrink-0" />

          <span className="flex-1 text-left truncate">{folder.name}</span>

          {/* Show unreadCount for regular folders, red dot for drafts */}
          {(() => {
            const isDrafts = folder.name.toLowerCase().includes('draft');

            // Show red dot for drafts folder if there are any drafts
            if (isDrafts && folder.totalCount && folder.totalCount > 0) {
              return (
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              );
            }

            // Show unread count for other folders
            const count = folder.unreadCount;

            if (count && count > 0) {
              return (
                <span
                  className={cn(
                    'text-[10px] font-semibold px-1.5 py-0 rounded-full',
                    isSelected
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  {count}
                </span>
              );
            }
            return null;
          })()}
        </button>

        {hasChildren && isExpanded && (
          <div>
            {folder.children!.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2 text-xs text-red-600">
        <p>Failed to load folders</p>
        <button
          onClick={fetchFolders}
          className="mt-1 text-[10px] text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="p-2 text-xs text-muted-foreground text-center">
        No folders found
      </div>
    );
  }

  return (
    <div className="py-1">
      {folders.map((folder) => renderFolder(folder))}
    </div>
  );
}
