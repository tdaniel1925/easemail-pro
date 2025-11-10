'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Check, AlertCircle, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Account {
  id: string;
  grantId: string;
  email: string;
  provider: string;
  isActive: boolean;
}

interface SyncResult {
  success: boolean;
  total: number;
  imported: number;
  skipped: number;
  errors: number;
}

interface SyncContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SyncContactsModal({ isOpen, onClose, onSuccess }: SyncContactsModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<{ [key: string]: boolean }>({});
  const [results, setResults] = useState<{ [key: string]: SyncResult }>({});

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
    }
  }, [isOpen]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/nylas/accounts');
      const data = await response.json();

      if (data.success) {
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (account: Account) => {
    try {
      setSyncing({ ...syncing, [account.id]: true });

      const response = await fetch('/api/contacts/sync/nylas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grantId: account.grantId }),
      });

      const data = await response.json();

      if (data.success) {
        setResults({
          ...results,
          [account.id]: {
            success: true,
            total: data.total,
            imported: data.imported,
            skipped: data.skipped,
            errors: data.errors,
          },
        });
        onSuccess();
      } else {
        setResults({
          ...results,
          [account.id]: {
            success: false,
            total: 0,
            imported: 0,
            skipped: 0,
            errors: 1,
          },
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      setResults({
        ...results,
        [account.id]: {
          success: false,
          total: 0,
          imported: 0,
          skipped: 0,
          errors: 1,
        },
      });
    } finally {
      setSyncing({ ...syncing, [account.id]: false });
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return '📧';
      case 'microsoft':
        return '📨';
      default:
        return '✉️';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync Contacts from Email Accounts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Sync contacts from your connected Gmail and Outlook accounts. Existing contacts will be skipped.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Email Accounts Connected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Gmail or Outlook account to sync contacts
              </p>
              <Button onClick={() => window.location.href = '/settings'}>
                Go to Settings
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => {
                const isSyncing = syncing[account.id];
                const result = results[account.id];

                return (
                  <div
                    key={account.id}
                    className={cn(
                      'border rounded-lg p-4 transition-all',
                      result?.success && 'border-green-500 bg-green-50 dark:bg-green-950/20'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-2xl">{getProviderIcon(account.provider)}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{account.email}</h4>
                          <p className="text-xs text-muted-foreground capitalize">
                            {account.provider} Account
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleSync(account)}
                        disabled={isSyncing || !account.isActive}
                        size="sm"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Syncing...
                          </>
                        ) : result?.success ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Synced
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Now
                          </>
                        )}
                      </Button>
                    </div>

                    {result && (
                      <div className="mt-3 pt-3 border-t text-sm">
                        {result.success ? (
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total contacts found:</span>
                              <span className="font-medium">{result.total}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-green-600 dark:text-green-400">Imported:</span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {result.imported}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Skipped (already exist):</span>
                              <span className="font-medium">{result.skipped}</span>
                            </div>
                            {result.errors > 0 && (
                              <div className="flex justify-between">
                                <span className="text-red-600 dark:text-red-400">Errors:</span>
                                <span className="font-medium text-red-600 dark:text-red-400">
                                  {result.errors}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-red-600 dark:text-red-400 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Failed to sync contacts. Please try again.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
