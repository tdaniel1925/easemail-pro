/**
 * FocusLeftSidebar Component
 * Slide-out tab sidebar with account switcher and folder list
 */

'use client';

import { useState } from 'react';
import { ChevronRight, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import AccountSwitcher from '@/components/account/AccountSwitcher';
import { FolderSidebarV3 } from '@/components/nylas-v3/folder-sidebar-v3';

interface FocusLeftSidebarProps {
  accountId: string | null;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string, folderName: string) => void;
}

export function FocusLeftSidebar({
  accountId,
  selectedFolderId,
  onFolderSelect,
}: FocusLeftSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!accountId) return null;

  return (
    <>
      {/* Slide-out sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 z-30",
          "transition-transform duration-300 ease-out",
          "w-72 flex",
          isOpen ? "translate-x-0" : "-translate-x-64"
        )}
      >
        {/* Main sidebar panel */}
        <div className="flex-1 backdrop-blur-xl bg-gradient-to-br from-white/15 to-white/5 border-r border-white/20 shadow-2xl flex flex-col">
          {/* Account Switcher */}
          <div className="p-3 border-b border-white/10 flex-shrink-0">
            <AccountSwitcher />
          </div>

          {/* Folder List - Scrollable with Focus Mode styling */}
          <div className="flex-1 overflow-y-auto focus-folders-scrollbar [&_button]:text-white [&_button:hover]:bg-white/10 [&_button.bg-primary]:bg-primary/80 [&_button.bg-primary:hover]:bg-primary">
            <FolderSidebarV3
              accountId={accountId}
              selectedFolderId={selectedFolderId}
              onFolderSelect={onFolderSelect}
            />
          </div>
        </div>

        {/* Tab handle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-8 h-20 flex items-center justify-center",
            "backdrop-blur-md bg-gradient-to-r from-white/15 to-white/10",
            "border border-l-0 border-white/20 rounded-r-xl",
            "hover:from-white/20 hover:to-white/15 transition-all duration-200",
            "group self-center",
            "shadow-lg"
          )}
          title={isOpen ? "Close folders" : "Open folders"}
        >
          <ChevronRight
            className={cn(
              "h-5 w-5 text-white/70 group-hover:text-white transition-all duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Backdrop when open (optional) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
