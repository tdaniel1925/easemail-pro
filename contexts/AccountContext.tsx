'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Account {
  id: string;
  emailAddress: string;
  provider?: string; // 'nylas', 'aurinko', or 'imap'
  emailProvider?: string;
  nylasProvider?: string;
  nylasGrantId?: string;
  syncStatus?: string;
  syncProgress?: number;
  isActive?: boolean;
  isDefault?: boolean;
  createdAt?: string;
}

interface AccountContextType {
  selectedAccount: Account | null;
  setSelectedAccount: (account: Account | null) => void;
  accounts: Account[];
  setAccounts: (accounts: Account[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const SELECTED_ACCOUNT_KEY = 'easemail_selected_account';

export function AccountProvider({ children }: { children: ReactNode }) {
  const [selectedAccount, setSelectedAccountState] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load selected account from localStorage on mount
  useEffect(() => {
    const loadSelectedAccount = async () => {
      try {
        // First, fetch all accounts
        const response = await fetch('/api/nylas/accounts');
        const data = await response.json();

        if (data.success && data.accounts) {
          setAccounts(data.accounts);

          // Try to restore from localStorage
          const savedAccountId = localStorage.getItem(SELECTED_ACCOUNT_KEY);

          if (savedAccountId) {
            const savedAccount = data.accounts.find((acc: Account) => acc.id === savedAccountId);
            if (savedAccount) {
              setSelectedAccountState(savedAccount);
              setIsLoading(false);
              return;
            }
          }

          // If no saved account or it doesn't exist, use default or first active account
          const defaultAccount = data.accounts.find((acc: Account) => acc.isDefault && acc.isActive);
          const firstActiveAccount = data.accounts.find((acc: Account) => acc.isActive);
          const fallbackAccount = defaultAccount || firstActiveAccount || data.accounts[0];

          if (fallbackAccount) {
            setSelectedAccountState(fallbackAccount);
            localStorage.setItem(SELECTED_ACCOUNT_KEY, fallbackAccount.id);
          }
        }
      } catch (error) {
        console.error('Failed to load accounts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSelectedAccount();
  }, []);

  // Persist selected account to localStorage
  const setSelectedAccount = (account: Account | null) => {
    setSelectedAccountState(account);
    if (account) {
      localStorage.setItem(SELECTED_ACCOUNT_KEY, account.id);
    } else {
      localStorage.removeItem(SELECTED_ACCOUNT_KEY);
    }
  };

  return (
    <AccountContext.Provider
      value={{
        selectedAccount,
        setSelectedAccount,
        accounts,
        setAccounts,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
