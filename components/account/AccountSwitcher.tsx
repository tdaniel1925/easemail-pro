'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Mail, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn, getInitials, generateAvatarColor } from '@/lib/utils';
import { useAccount } from '@/contexts/AccountContext';
import { useRouter } from 'next/navigation';

export default function AccountSwitcher() {
  const { selectedAccount, setSelectedAccount, accounts, isLoading } = useAccount();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-muted/50">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <Button
        variant="outline"
        onClick={() => router.push('/accounts-v3')}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Account
      </Button>
    );
  }

  const activeAccounts = accounts.filter(acc => acc.isActive);
  const filteredAccounts = activeAccounts.filter(acc =>
    acc.emailAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const initials = getInitials(selectedAccount.emailAddress);
  const bgColor = generateAvatarColor(selectedAccount.emailAddress);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between gap-2 px-3 py-2 h-auto"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
              style={{ backgroundColor: bgColor }}
            >
              {initials}
            </div>

            {/* Account Info */}
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-medium truncate max-w-[200px]">
                {selectedAccount.emailAddress}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {selectedAccount.emailProvider || selectedAccount.nylasProvider || 'Email'}
                </span>
                {selectedAccount.syncStatus === 'syncing' && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    Syncing
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="flex flex-col">
          {/* Search */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
            />
          </div>

          {/* Account List */}
          <ScrollArea className="max-h-[300px]">
            {filteredAccounts.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No accounts found.
              </div>
            ) : (
              <div className="p-1">
                {filteredAccounts.map((account) => {
                const accountInitials = getInitials(account.emailAddress);
                const accountBgColor = generateAvatarColor(account.emailAddress);
                const isSelected = selectedAccount?.id === account.id;

                return (
                  <div
                    key={account.id}
                    onClick={() => {
                      setSelectedAccount(account);
                      setOpen(false);
                    }}
                    className="flex items-center gap-3 py-3 px-2 cursor-pointer rounded-md hover:bg-accent transition-colors"
                  >
                    {/* Avatar */}
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                      style={{ backgroundColor: accountBgColor }}
                    >
                      {accountInitials}
                    </div>

                    {/* Account Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {account.emailAddress}
                        </span>
                        {account.isDefault && (
                          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {account.emailProvider || account.nylasProvider || 'Email'}
                        </span>
                        {account.syncStatus === 'syncing' && (
                          <span className="text-xs text-blue-600">• Syncing</span>
                        )}
                      </div>
                    </div>

                    {/* Check Icon */}
                    <Check
                      className={cn(
                        'h-4 w-4 flex-shrink-0',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </div>
                );
              })}
              </div>
            )}
          </ScrollArea>

          <Separator />

          {/* Actions */}
          <div className="p-1">
            <div
              onClick={() => {
                setOpen(false);
                router.push('/accounts-v3');
              }}
              className="flex items-center gap-3 py-3 px-2 cursor-pointer rounded-md hover:bg-accent transition-colors"
            >
              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted flex-shrink-0">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Add Account</span>
            </div>

            <div
              onClick={() => {
                setOpen(false);
                router.push('/accounts-v3');
              }}
              className="flex items-center gap-3 py-3 px-2 cursor-pointer rounded-md hover:bg-accent transition-colors"
            >
              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted flex-shrink-0">
                <Mail className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Manage Accounts</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
