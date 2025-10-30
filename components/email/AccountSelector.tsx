'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronDown, Plus, Mail } from 'lucide-react';
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
}

interface AccountSelectorProps {
  onAccountChange?: (accountId: string) => void;
}

export default function AccountSelector({ onAccountChange }: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [loading, setLoading] = useState(true);

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
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
                  style={{ backgroundColor: generateAvatarColor(account.emailAddress) }}
                >
                  {getInitials(account.emailAddress)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{account.emailAddress}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getProviderColor(account.nylasProvider) }}
                    />
                    <span className="text-xs text-muted-foreground capitalize">
                      {account.emailProvider || account.nylasProvider}
                    </span>
                    {account.syncStatus === 'syncing' && (
                      <span className="text-xs text-blue-500">● Syncing</span>
                    )}
                  </div>
                </div>
              </div>
              {selectedAccount?.id === account.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
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

