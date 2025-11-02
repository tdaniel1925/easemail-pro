/**
 * Folder Search Command Menu
 * 
 * Cmd+K / Ctrl+K quick folder search like Superhuman
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Folder, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchFolders, getFolderPath } from '@/lib/email/folder-tree';

interface FolderSearchProps {
  isOpen: boolean;
  onClose: () => void;
  folders: any[];
  onSelectFolder: (folderName: string) => void;
  getFolderIcon: (folderType: string) => any;
}

export function FolderSearch({
  isOpen,
  onClose,
  folders,
  onSelectFolder,
  getFolderIcon,
}: FolderSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredFolders, setFilteredFolders] = useState<any[]>([]);

  // Filter folders based on query
  useEffect(() => {
    if (query.trim()) {
      const results = searchFolders(folders, query);
      setFilteredFolders(results.slice(0, 10)); // Limit to 10 results
      setSelectedIndex(0);
    } else {
      // Show all folders when no query
      setFilteredFolders(folders.slice(0, 10));
      setSelectedIndex(0);
    }
  }, [query, folders]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          Math.min(prev + 1, filteredFolders.length - 1)
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredFolders[selectedIndex]) {
          const folder = filteredFolders[selectedIndex];
          const folderName = folder.name || folder.folderType?.toLowerCase() || 'inbox';
          onSelectFolder(folderName);
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredFolders, selectedIndex, onSelectFolder, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in"
        onClick={onClose}
      />

      {/* Command Menu */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 animate-in slide-in-from-top-10">
        <div className="bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search folders..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-sm"
              autoFocus
            />
            <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {filteredFolders.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                No folders found
              </div>
            ) : (
              <div className="py-2">
                {filteredFolders.map((folder, index) => {
                  const Icon = getFolderIcon(folder.folderType);
                  const path = getFolderPath(folder.id, folders);
                  const isSelected = index === selectedIndex;

                  return (
                    <button
                      key={folder.id}
                      onClick={() => {
                        const folderName = folder.name || folder.folderType?.toLowerCase() || 'inbox';
                        onSelectFolder(folderName);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                        isSelected
                          ? 'bg-accent'
                          : 'hover:bg-accent/50'
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      
                      <div className="flex-1 text-left">
                        <div className="font-medium">{folder.displayName || folder.name}</div>
                        {path.length > 1 && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            {path.slice(0, -1).map((p, i) => (
                              <React.Fragment key={i}>
                                <span>{p}</span>
                                {i < path.length - 2 && <ArrowRight className="h-3 w-3" />}
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>

                      {folder.unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground flex-shrink-0">
                          {folder.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-background rounded">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background rounded">Enter</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background rounded">Esc</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

