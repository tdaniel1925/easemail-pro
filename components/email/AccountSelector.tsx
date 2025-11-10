'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronDown, Plus, Mail, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, getInitials, generateAvatarColor } from '@/lib/utils';

interface EmailAccount {
  id: string;
  emailAddress: string;
  emailProvider: string;
  syncStatus: string;
  isDefault: boolean;
  nylasProvider?: string;
  nylasGrantId?: string;
  lastError?: string;
  syncedEmailCount?: number;
  totalEmailCount?: number;
}

interface AccountSelectorProps {
  onAccountChange?: (accountId: string) => void;
}

export default function AccountSelector({ onAccountChange }: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/nylas/accounts');
      const data = await response.json();
      
      if (data.success && data.accounts) {
        setAccounts(data.accounts);
        // Select first account or default account
        const defaultAccount = data.accounts.find((a: EmailAccount) => a.isDefault) || data.accounts[0];
        if (defaultAccount) {
          setSelectedAccount(defaultAccount);
          onAccountChange?.(defaultAccount.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = (account: EmailAccount) => {
    setSelectedAccount(account);
    onAccountChange?.(account.id);
  };

  const handleManualSync = async (accountId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent dropdown from closing

    try {
      setSyncingAccountId(accountId);

      const response = await fetch(`/api/nylas/accounts/${accountId}/sync`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        // Refresh accounts to get updated sync status
        await fetchAccounts();
      } else {
        console.error('Sync failed:', data.error);
        // TODO: Show error toast notification
      }
    } catch (error) {
      console.error('Manual sync error:', error);
      // TODO: Show error toast notification
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleAddAccount = () => {
    // Navigate to OAuth flow
    window.location.href = '/api/nylas/auth?provider=google';
  };

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Mail className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (accounts.length === 0) {
    return (
      <Button variant="outline" size="sm" onClick={handleAddAccount}>
        <Plus className="h-4 w-4 mr-2" />
        Add Account
      </Button>
    );
  }

  const getProviderColor = (provider?: string) => {
    switch (provider) {
      case 'google':
        return '#EA4335';
      case 'microsoft':
        return '#0078D4';
      default:
        return '#6B7280';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          {selectedAccount && (
            <>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: generateAvatarColor(selectedAccount.emailAddress) }}
              >
                {getInitials(selectedAccount.emailAddress)}
              </div>
              <span className="max-w-[150px] truncate">{selectedAccount.emailAddress}</span>
              <ChevronDown className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">Email Accounts</p>
            <p className="text-xs text-muted-foreground">
              Switch between your connected accounts
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {accounts.map((account) => (
          <DropdownMenuItem
            key={account.id}
            onClick={() => handleAccountSelect(account)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                  style={{ backgroundColor: generateAvatarColor(account.emailAddress) }}
                >
                  {getInitials(account.emailAddress)}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">{account.emailAddress}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getProviderColor(account.nylasProvider) }}
                    />
                    <span className="text-xs text-muted-foreground capitalize">
                      {account.emailProvider || account.nylasProvider}
                    </span>
                    {account.syncStatus === 'syncing' && (
                      <span className="text-xs text-blue-500 flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Syncing
                      </span>
                    )}
                    {account.lastError && (
                      <span title={account.lastError}>
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {syncingAccountId === account.id ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                ) : (
                  <button
                    onClick={(e) => handleManualSync(account.id, e)}
                    className="p-1 hover:bg-accent rounded-sm transition-colors"
                    title="Sync account"
                  >
                    <RefreshCw className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
                {selectedAccount?.id === account.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleAddAccount} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          <span>Add Account</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

