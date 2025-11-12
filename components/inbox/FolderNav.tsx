'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  Archive,
  Star,
  Clock,
  AlertCircle,
  Tag,
  Settings,
} from 'lucide-react';

type FolderType = 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive' | 'starred';

interface Account {
  id: string;
  emailAddress: string;
  emailProvider: string | null;
  isDefault: boolean | null;
  syncStatus: string | null;
}

interface FolderNavProps {
  currentFolder: FolderType;
  onFolderChange: (folder: FolderType) => void;
  accounts: Account[];
  selectedAccount: string | null;
  onAccountChange: (accountId: string) => void;
}

const folders: Array<{
  id: FolderType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}> = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'starred', label: 'Starred', icon: Star, color: 'text-yellow-500' },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

export default function FolderNav({
  currentFolder,
  onFolderChange,
  accounts,
  selectedAccount,
  onAccountChange,
}: FolderNavProps) {
  const getProviderIcon = (provider: string | null | undefined) => {
    switch (provider?.toLowerCase()) {
      case 'google':
      case 'gmail':
        return '📧';
      case 'microsoft':
      case 'outlook':
        return '📨';
      case 'imap':
        return '📮';
      default:
        return '✉️';
    }
  };

  return (
    <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          EaseMail V4
        </h1>

        {/* Account Selector */}
        {accounts.length > 0 && (
          <Select value={selectedAccount || undefined} onValueChange={onAccountChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select account">
                {selectedAccount && (
                  <span className="flex items-center gap-2">
                    <span>
                      {getProviderIcon(
                        accounts.find(a => a.id === selectedAccount)?.emailProvider
                      )}
                    </span>
                    <span className="truncate">
                      {accounts.find(a => a.id === selectedAccount)?.emailAddress}
                    </span>
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {accounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex items-center gap-2">
                    <span>{getProviderIcon(account.emailProvider ?? null)}</span>
                    <span className="truncate">{account.emailAddress}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Folders */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {folders.map(folder => {
            const Icon = folder.icon;
            const isActive = currentFolder === folder.id;

            return (
              <Button
                key={folder.id}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  isActive && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                )}
                onClick={() => onFolderChange(folder.id)}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 mr-3',
                    folder.color || (isActive ? 'text-blue-600 dark:text-blue-400' : '')
                  )}
                />
                <span className="flex-1 text-left">{folder.label}</span>
                {/* TODO: Add unread count badges */}
              </Button>
            );
          })}
        </div>

        {/* Labels Section (Future Enhancement) */}
        <div className="mt-6 px-2">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Labels
          </h3>
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm"
              disabled
            >
              <Tag className="h-4 w-4 mr-3 text-gray-400" />
              <span className="text-gray-400">No labels yet</span>
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <Button variant="outline" className="w-full justify-start" asChild>
          <a href="/settings">
            <Settings className="h-4 w-4 mr-3" />
            Settings
          </a>
        </Button>

        {/* Storage Info (Optional) */}
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex justify-between mb-1">
            <span>Storage</span>
            <span>2.5 GB / 15 GB</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full"
              style={{ width: '16.7%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
