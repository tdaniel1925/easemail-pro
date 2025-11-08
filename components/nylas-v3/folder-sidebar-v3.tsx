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
      fetchFolders();
    }
  }, [accountId]);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/nylas-v3/folders?accountId=${accountId}&hierarchy=true`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }

      const data = await response.json();
      setFolders(data.folders || []);
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
            'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
            'hover:bg-accent',
            isSelected && 'bg-primary text-primary-foreground font-medium'
          )}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => toggleFolder(folder.id, e)}
              className="p-0.5 hover:bg-accent rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}

          <Icon className="h-4 w-4 flex-shrink-0" />

          <span className="flex-1 text-left truncate">{folder.name}</span>

          {folder.unreadCount && folder.unreadCount > 0 && (
            <span
              className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full',
                isSelected
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-primary/10 text-primary'
              )}
            >
              {folder.unreadCount}
            </span>
          )}
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
      <div className="flex-1 flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600">
        <p>Failed to load folders</p>
        <button
          onClick={fetchFolders}
          className="mt-2 text-xs text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        No folders found
      </div>
    );
  }

  return (
    <div className="py-2">
      {folders.map((folder) => renderFolder(folder))}
    </div>
  );
}
