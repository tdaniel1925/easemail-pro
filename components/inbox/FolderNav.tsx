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
  Mail,
  AtSign,
  Server,
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
    const iconClass = 'h-4 w-4';
    switch (provider?.toLowerCase()) {
      case 'google':
      case 'gmail':
        return <Mail className={cn(iconClass, 'text-primary')} />;
      case 'microsoft':
      case 'outlook':
        return <AtSign className={cn(iconClass, 'text-primary')} />;
      case 'imap':
        return <Server className={cn(iconClass, 'text-muted-foreground')} />;
      default:
        return <Mail className={cn(iconClass, 'text-muted-foreground')} />;
    }
  };

  return (
    <div className="w-[var(--sidebar-width)] border-r border-border bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold text-foreground mb-4">
          EaseMail V4
        </h1>

        {/* Account Selector */}
        {accounts.length > 0 && (
          <Select value={selectedAccount || undefined} onValueChange={onAccountChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select account">
                {selectedAccount && (
                  <span className="flex items-center gap-2">
                    {getProviderIcon(
                      accounts.find(a => a.id === selectedAccount)?.emailProvider
                    )}
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
                    {getProviderIcon(account.emailProvider ?? null)}
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
                  'w-full justify-start transition-smooth',
                  isActive && 'bg-primary/10 text-primary font-medium'
                )}
                onClick={() => onFolderChange(folder.id)}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 mr-3',
                    folder.color || (isActive ? 'text-primary' : 'text-muted-foreground')
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
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Labels
          </h3>
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm"
              disabled
            >
              <Tag className="h-4 w-4 mr-3 text-muted-foreground" />
              <span className="text-muted-foreground">No labels yet</span>
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <Button variant="outline" className="w-full justify-start transition-smooth" asChild>
          <a href="/settings">
            <Settings className="h-4 w-4 mr-3" />
            Settings
          </a>
        </Button>

        {/* Storage Info (Optional) */}
        <div className="mt-3 text-xs text-muted-foreground">
          <div className="flex justify-between mb-1">
            <span>Storage</span>
            <span>2.5 GB / 15 GB</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1">
            <div
              className="bg-primary h-1 rounded-full transition-smooth"
              style={{ width: '16.7%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
