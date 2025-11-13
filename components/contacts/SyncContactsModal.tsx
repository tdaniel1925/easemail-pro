'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Check, AlertCircle, X, Loader2, StopCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface Account {
  id: string;
  nylasGrantId: string;
  emailAddress: string;
  emailProvider: string;
  isActive: boolean;
}

interface SyncProgress {
  type: 'start' | 'fetching' | 'processing' | 'progress' | 'complete' | 'error';
  accountName?: string;
  status?: string;
  total?: number;
  current?: number;
  percentage?: number;
  imported?: number;
  skipped?: number;
  errors?: number;
  error?: string;
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
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<{ [key: string]: boolean }>({});
  const [progress, setProgress] = useState<{ [key: string]: SyncProgress }>({});
  const [results, setResults] = useState<{ [key: string]: SyncResult }>({});
  const abortControllersRef = useRef<{ [key: string]: AbortController }>({});

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
      console.log('🔄 Syncing account:', {
        id: account.id,
        email: account.emailAddress,
        grantId: account.nylasGrantId,
      });

      if (!account.nylasGrantId) {
        console.error('❌ No Nylas grant ID for account:', account.emailAddress);
        console.error('Account data:', account);

        toast({
          title: 'Cannot sync account',
          description: `${account.emailAddress} is not properly connected to Nylas. Please reconnect it in Settings.`,
          variant: 'destructive'
        });

        setResults(prev => ({
          ...prev,
          [account.id]: {
            success: false,
            total: 0,
            imported: 0,
            skipped: 0,
            errors: 1,
          },
        }));
        return;
      }

      // Create AbortController for this sync
      const abortController = new AbortController();
      abortControllersRef.current[account.id] = abortController;

      setSyncing(prev => ({ ...prev, [account.id]: true }));
      setProgress(prev => ({
        ...prev,
        [account.id]: {
          type: 'start',
          accountName: account.emailAddress,
          status: 'Starting sync...'
        }
      }));

      // Use streaming API with SSE
      const response = await fetch('/api/contacts/sync/nylas?stream=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grantId: account.nylasGrantId,
          accountName: account.emailAddress
        }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start sync');
      }

      // Read streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        // Decode chunk and parse SSE events
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: SyncProgress = JSON.parse(line.slice(6));

              setProgress(prev => ({
                ...prev,
                [account.id]: data
              }));

              // Handle completion
              if (data.type === 'complete') {
                setResults(prev => ({
                  ...prev,
                  [account.id]: {
                    success: true,
                    total: data.total || 0,
                    imported: data.imported || 0,
                    skipped: data.skipped || 0,
                    errors: data.errors || 0,
                  },
                }));
                onSuccess();

                toast({
                  title: 'Sync complete',
                  description: `Imported ${data.imported} contacts from ${account.emailAddress}`,
                });
              }

              // Handle error
              if (data.type === 'error') {
                setResults(prev => ({
                  ...prev,
                  [account.id]: {
                    success: false,
                    total: 0,
                    imported: 0,
                    skipped: 0,
                    errors: 1,
                  },
                }));

                toast({
                  title: 'Sync failed',
                  description: data.error || 'Failed to sync contacts',
                  variant: 'destructive'
                });
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error: any) {
      // Check if it was aborted
      if (error.name === 'AbortError') {
        console.log('Sync cancelled for account:', account.emailAddress);

        toast({
          title: 'Sync cancelled',
          description: `Stopped syncing ${account.emailAddress}`,
        });

        setProgress(prev => ({
          ...prev,
          [account.id]: {
            type: 'error',
            status: 'Cancelled by user'
          }
        }));
      } else {
        console.error('Sync error:', error);

        toast({
          title: 'Sync error',
          description: error.message || 'Failed to sync contacts',
          variant: 'destructive'
        });

        setResults(prev => ({
          ...prev,
          [account.id]: {
            success: false,
            total: 0,
            imported: 0,
            skipped: 0,
            errors: 1,
          },
        }));
      }
    } finally {
      setSyncing(prev => ({ ...prev, [account.id]: false }));
      delete abortControllersRef.current[account.id];
    }
  };

  // Stop sync for an account
  const handleStopSync = (accountId: string) => {
    const controller = abortControllersRef.current[accountId];
    if (controller) {
      controller.abort();
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
      <DialogContent className="max-w-2xl" aria-describedby="sync-contacts-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync Contacts from Email Accounts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p id="sync-contacts-description" className="text-sm text-muted-foreground">
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
                const currentProgress = progress[account.id];
                const result = results[account.id];

                return (
                  <div
                    key={account.id}
                    className={cn(
                      'border rounded-lg p-4 transition-all',
                      result?.success && 'border-green-500 bg-green-50 dark:bg-green-950/20',
                      isSyncing && 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-2xl">{getProviderIcon(account.emailProvider)}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{account.emailAddress}</h4>
                          <p className="text-xs text-muted-foreground capitalize">
                            {account.emailProvider} Account
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSyncing && (
                          <Button
                            onClick={() => handleStopSync(account.id)}
                            variant="destructive"
                            size="sm"
                          >
                            <StopCircle className="h-4 w-4 mr-2" />
                            Stop
                          </Button>
                        )}
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
                    </div>

                    {/* Real-time Progress */}
                    {isSyncing && currentProgress && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {currentProgress.status || 'Syncing...'}
                          </span>
                          {currentProgress.percentage !== undefined && (
                            <span className="font-mono font-medium">
                              {currentProgress.percentage}%
                            </span>
                          )}
                        </div>

                        {currentProgress.total !== undefined && currentProgress.total > 0 && (
                          <>
                            <Progress value={currentProgress.percentage || 0} className="h-2" />
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total:</span>
                                <span className="font-medium">{currentProgress.total}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Current:</span>
                                <span className="font-medium">{currentProgress.current || 0}</span>
                              </div>
                              {currentProgress.imported !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-green-600 dark:text-green-400">Imported:</span>
                                  <span className="font-medium text-green-600 dark:text-green-400">
                                    {currentProgress.imported}
                                  </span>
                                </div>
                              )}
                              {currentProgress.skipped !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Skipped:</span>
                                  <span className="font-medium">{currentProgress.skipped}</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Final Results */}
                    {!isSyncing && result && (
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
