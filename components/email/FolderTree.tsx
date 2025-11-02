/**
 * Folder Tree Component
 * 
 * Renders hierarchical folder structure with nesting
 * Like Outlook: Shows nested folders with indentation
 */

import React from 'react';
import { ChevronRight, ChevronDown, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FolderNode } from '@/lib/email/folder-tree';

interface FolderTreeItemProps {
  folder: FolderNode;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: (folderId: string) => void;
  onSelect: (folderName: string) => void;
  Icon?: any;
  realTimeCount?: { totalCount: number; unreadCount: number };
}

export function FolderTreeItem({
  folder,
  isActive,
  isExpanded,
  onToggle,
  onSelect,
  Icon = Folder,
  realTimeCount,
}: FolderTreeItemProps) {
  const hasChildren = folder.children.length > 0;
  const count = realTimeCount?.unreadCount || folder.unreadCount || 0;

  return (
    <div>
      <button
        onClick={(e) => {
          // If clicking chevron, just toggle
          if (hasChildren && (e.target as HTMLElement).closest('.folder-chevron')) {
            onToggle(folder.id);
          } else {
            // Otherwise select folder
            onSelect(folder.name || folder.folderType?.toLowerCase() || 'inbox');
          }
        }}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all',
          isActive
            ? 'bg-primary text-primary-foreground font-medium shadow-sm'
            : 'hover:bg-accent hover:shadow-sm text-muted-foreground'
        )}
        style={{ paddingLeft: `${12 + folder.depth * 20}px` }} // Indent based on depth
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Chevron for expandable folders */}
          {hasChildren && (
            <div className="folder-chevron flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </div>
          )}
          
          {/* Folder icon */}
          <Icon className="h-4 w-4 flex-shrink-0" />
          
          {/* Folder name */}
          <span className="truncate">{folder.displayName}</span>
        </div>

        {/* Unread count badge */}
        {count > 0 && (
          <span
            className={cn(
              'px-2 py-0.5 text-xs rounded-full flex-shrink-0',
              isActive
                ? 'bg-primary-foreground text-primary'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {count}
          </span>
        )}
      </button>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && (
        <div className="ml-2">
          {folder.children.map(child => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              isActive={isActive}
              isExpanded={isExpanded}
              onToggle={onToggle}
              onSelect={onSelect}
              Icon={Icon}
              realTimeCount={realTimeCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FolderTreeProps {
  folders: FolderNode[];
  activeFolder: string;
  expandedFolders: Set<string>;
  onToggleExpand: (folderId: string) => void;
  onSelectFolder: (folderName: string) => void;
  getFolderIcon: (folderType: string) => any;
  folderCounts: Record<string, { totalCount: number; unreadCount: number }>;
}

export function FolderTree({
  folders,
  activeFolder,
  expandedFolders,
  onToggleExpand,
  onSelectFolder,
  getFolderIcon,
  folderCounts,
}: FolderTreeProps) {
  return (
    <div className="space-y-0.5">
      {folders.map(folder => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          isActive={activeFolder === (folder.name || folder.folderType?.toLowerCase())}
          isExpanded={expandedFolders.has(folder.id)}
          onToggle={onToggleExpand}
          onSelect={onSelectFolder}
          Icon={getFolderIcon(folder.folderType)}
          realTimeCount={folderCounts[folder.name?.toLowerCase() || '']}
        />
      ))}
    </div>
  );
}

