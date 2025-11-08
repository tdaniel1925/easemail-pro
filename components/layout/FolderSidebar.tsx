'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Star, Clock, Send, FileText, Trash2, Archive, Folder, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FolderSidebarProps {
  selectedAccountId: string | null;
  onFolderSelect?: (folderId: string, folderName: string) => void;
}

interface EmailFolder {
  id: string;
  name: string;
  displayName: string;
  accountId: string;
  nylasId?: string;
  parentId?: string | null;
  attributes?: string[];
  totalCount?: number;
  unreadCount?: number;
}

interface FolderCounts {
  totalCount: number;
  unreadCount: number;
}

export default function FolderSidebar({ selectedAccountId, onFolderSelect }: FolderSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [folders, setFolders] = useState<EmailFolder[]>([]);
  const [folderCounts, setFolderCounts] = useState<Record<string, FolderCounts>>({});
  const [loading, setLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activeFolder, setActiveFolder] = useState<string>('inbox');

  // Refs for stable state
  const selectedAccountIdRef = useRef<string | null>(null);

  // Update ref when account changes
  useEffect(() => {
    selectedAccountIdRef.current = selectedAccountId;
  }, [selectedAccountId]);

  // Load folders when account changes
  useEffect(() => {
    if (selectedAccountId) {
      loadFolders(selectedAccountId);
    } else {
      setFolders([]);
      setFolderCounts({});
    }
  }, [selectedAccountId]);

  // Set active folder from URL
  useEffect(() => {
    const folderParam = searchParams?.get('folder');
    if (folderParam) {
      setActiveFolder(folderParam);
    }
  }, [searchParams]);

  const loadFolders = async (accountId: string) => {
    setLoading(true);
    try {
      // Load from localStorage first
      if (typeof window !== 'undefined') {
        const cachedFolders = localStorage.getItem(`easemail_folders_${accountId}`);
        const cachedCounts = localStorage.getItem(`easemail_folder_counts_${accountId}`);

        if (cachedFolders) {
          const parsedFolders = JSON.parse(cachedFolders);
          setFolders(parsedFolders);
        }

        if (cachedCounts) {
          const parsedCounts = JSON.parse(cachedCounts);
          setFolderCounts(parsedCounts);
        }
      }

      // Fetch fresh data from API
      const response = await fetch(`/api/nylas/folders/sync?accountId=${accountId}`);
      const data = await response.json();

      if (data.success) {
        const freshFolders = data.folders || [];
        setFolders(freshFolders);

        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(`easemail_folders_${accountId}`, JSON.stringify(freshFolders));
        }

        // Fetch counts
        await loadFolderCounts(accountId, freshFolders);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolderCounts = async (accountId: string, foldersList: EmailFolder[]) => {
    try {
      const response = await fetch(`/api/nylas/folders/counts?accountId=${accountId}`);
      const data = await response.json();

      if (data.success && data.counts) {
        const countsMap: Record<string, FolderCounts> = {};

        data.counts.forEach((count: any) => {
          countsMap[count.folderName] = {
            totalCount: count.totalCount,
            unreadCount: count.unreadCount,
          };
        });

        setFolderCounts(countsMap);

        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(`easemail_folder_counts_${accountId}`, JSON.stringify(countsMap));
        }
      }
    } catch (error) {
      console.error('Failed to load folder counts:', error);
    }
  };

  const handleFolderClick = (folder: EmailFolder) => {
    setActiveFolder(folder.name);

    // Navigate to inbox with folder filter
    router.push(`/?folder=${folder.name}`);

    // Call callback if provided
    if (onFolderSelect) {
      onFolderSelect(folder.id, folder.name);
    }
  };

  const toggleFolderExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const getFolderIcon = (folderName: string, attributes?: string[]) => {
    const name = folderName.toLowerCase();
    if (name === 'inbox' || attributes?.includes('\\Inbox')) return Mail;
    if (name === 'sent' || attributes?.includes('\\Sent')) return Send;
    if (name === 'drafts' || attributes?.includes('\\Drafts')) return FileText;
    if (name === 'trash' || attributes?.includes('\\Trash')) return Trash2;
    if (name === 'archive' || attributes?.includes('\\Archive')) return Archive;
    if (name === 'starred' || name === 'important') return Star;
    if (name === 'spam' || name === 'junk') return AlertCircle;
    return Folder;
  };

  // Organize folders into hierarchy
  const standardFolders = folders.filter(f => {
    const name = f.name.toLowerCase();
    return ['inbox', 'sent', 'drafts', 'trash', 'spam', 'junk', 'archive', 'starred', 'important'].includes(name);
  });

  const customFolders = folders.filter(f => {
    const name = f.name.toLowerCase();
    return !['inbox', 'sent', 'drafts', 'trash', 'spam', 'junk', 'archive', 'starred', 'important'].includes(name) && !f.parentId;
  });

  const getChildFolders = (parentId: string) => {
    return folders.filter(f => f.parentId === parentId);
  };

  const renderFolder = (folder: EmailFolder, level: number = 0) => {
    const Icon = getFolderIcon(folder.name, folder.attributes);
    const counts = folderCounts[folder.name];
    const hasChildren = folders.some(f => f.parentId === folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const childFolders = getChildFolders(folder.id);

    return (
      <div key={folder.id}>
        <button
          onClick={() => handleFolderClick(folder)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all group",
            activeFolder === folder.name
              ? "bg-primary text-primary-foreground font-medium shadow-sm"
              : "hover:bg-accent text-muted-foreground hover:text-foreground"
          )}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => toggleFolderExpand(folder.id, e)}
              className="hover:bg-accent/50 rounded p-0.5"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left truncate">{folder.displayName || folder.name}</span>
          {counts && counts.unreadCount > 0 && (
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              activeFolder === folder.name
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-primary/10 text-primary"
            )}>
              {counts.unreadCount}
            </span>
          )}
        </button>

        {/* Render children if expanded */}
        {isExpanded && childFolders.length > 0 && (
          <div className="ml-2">
            {childFolders.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!selectedAccountId) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Select an account to view folders
      </div>
    );
  }

  if (loading && folders.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Loading folders...
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Standard Folders */}
      <div className="space-y-1">
        {standardFolders.map(folder => renderFolder(folder))}
      </div>

      {/* Custom Folders */}
      {customFolders.length > 0 && (
        <>
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Folders
          </div>
          <div className="space-y-1">
            {customFolders.map(folder => renderFolder(folder))}
          </div>
        </>
      )}

      {folders.length === 0 && !loading && (
        <div className="p-4 text-center text-sm text-muted-foreground">
          No folders found
        </div>
      )}
    </div>
  );
}
