'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, Loader2, Mail, StopCircle, AlertCircle, TrendingUp, Database, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getInitials, generateAvatarColor } from '@/lib/utils';
import InboxLayout from '@/components/layout/InboxLayout';
import ProviderSelector from '@/components/email/ProviderSelector';

interface EmailAccount {
  id: string;
  emailAddress: string;
  emailProvider?: string;
  nylasProvider?: string;
  syncStatus?: string;
  syncProgress?: number;
  syncedEmailCount?: number;
  totalEmailCount?: number;
  initialSyncCompleted?: boolean;
  lastSyncedAt?: string;
  lastError?: string;
  folderCount?: number;
  emailCount?: number;
}

interface SyncMetrics {
  syncStatus: string;
  syncProgress: number;
  syncedEmailCount: number;
  totalEmailCount: number;
  emailsPerMinute: number;
  estimatedTimeRemaining: number | null;
  continuationCount: number;
  currentPage: number;
  maxPages: number;
  foldersSynced: number;
  lastError: string | null;
}

export default function AccountsV2Page() {
  return (
    <InboxLayout>
      <AccountsContent />
    </InboxLayout>
  );
}

function AccountsContent() {
  // State
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [isProviderSelectorOpen, setIsProviderSelectorOpen] = useState(false);
  const [syncMetrics, setSyncMetrics] = useState<Record<string, SyncMetrics>>({});

  // Refs for stable polling
  const accountsRef = useRef<EmailAccount[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref when accounts change
  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  // Initial load
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Memoized sync status checker
  const checkSyncStatus = useCallback(async () => {
    const currentAccounts = accountsRef.current;
    const syncingAccounts = currentAccounts.filter(a =>
      a.syncStatus === 'syncing' || a.syncStatus === 'background_syncing'
    );

    if (syncingAccounts.length === 0) return;

    for (const account of syncingAccounts) {
      try {
        const response = await fetch(`/api/nylas/sync/metrics?accountId=${account.id}`);
        const data = await response.json();

        if (data.success) {
          // Update metrics
          setSyncMetrics(prev => ({
            ...prev,
            [account.id]: data.metrics
          }));

          // Update account status
          setAccounts(prev => prev.map(a =>
            a.id === account.id
              ? {
                  ...a,
                  syncStatus: data.metrics.syncStatus,
                  syncProgress: data.metrics.syncProgress,
                  syncedEmailCount: data.metrics.syncedEmailCount,
                  totalEmailCount: data.metrics.totalEmailCount,
                  initialSyncCompleted: data.metrics.initialSyncCompleted,
                  lastSyncedAt: data.metrics.lastSyncedAt,
                  lastError: data.metrics.lastError,
                }
              : a
          ));
        }
      } catch (error) {
        console.error(`Failed to check sync status for ${account.id}:`, error);
      }
    }
  }, []);

  // Start/stop polling based on sync status
  useEffect(() => {
    const hasSyncingAccounts = accounts.some(a =>
      a.syncStatus === 'syncing' || a.syncStatus === 'background_syncing'
    );

    if (hasSyncingAccounts && !pollingIntervalRef.current) {
      // Start polling
      checkSyncStatus();
      pollingIntervalRef.current = setInterval(checkSyncStatus, 2000);
    } else if (!hasSyncingAccounts && pollingIntervalRef.current) {
      // Stop polling
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [accounts, checkSyncStatus]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/nylas/accounts');
      const data = await response.json();

      if (data.success) {
        const accountsWithStats = await Promise.all(
          data.accounts.map(async (account: EmailAccount) => {
            try {
              const statsResponse = await fetch(`/api/nylas/accounts/${account.id}/stats`);
              const stats = await statsResponse.json();
              return { ...account, folderCount: stats.folderCount || 0, emailCount: stats.emailCount || 0 };
            } catch {
              return { ...account, folderCount: 0, emailCount: 0 };
            }
          })
        );
        setAccounts(accountsWithStats);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      setMessage({ type: 'error', text: 'Failed to load accounts' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAccount = async (accountId: string) => {
    setSyncing(prev => ({ ...prev, [accountId]: true }));
    setMessage(null);

    try {
      // Optimistically update to syncing state
      setAccounts(prev => prev.map(a =>
        a.id === accountId
          ? {
              ...a,
              syncStatus: 'background_syncing',
              syncProgress: 0,
              syncedEmailCount: a.syncedEmailCount || 0,
              totalEmailCount: a.totalEmailCount || 0,
            }
          : a
      ));

      // Sync folders first
      const folderResponse = await fetch(`/api/nylas/folders/sync?accountId=${accountId}`, {
        method: 'POST',
      });

      if (!folderResponse.ok) {
        throw new Error('Folder sync failed');
      }

      // Trigger background sync (this will handle all email syncing)
      const bgSyncResponse = await fetch('/api/nylas/sync/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      if (!bgSyncResponse.ok) {
        throw new Error('Background sync failed to start');
      }

      setMessage({ type: 'success', text: 'Sync started successfully!' });
    } catch (error: any) {
      console.error('Sync failed:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to sync account' });

      // Revert optimistic update
      setAccounts(prev => prev.map(a =>
        a.id === accountId ? { ...a, syncStatus: 'idle' } : a
      ));
    } finally {
      setSyncing(prev => ({ ...prev, [accountId]: false }));
    }
  };

  const handleStopSync = async (accountId: string) => {
    try {
      await fetch('/api/nylas/sync/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      setMessage({ type: 'info', text: 'Sync stopped' });
      await fetchAccounts();
    } catch (error) {
      console.error('Stop sync failed:', error);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/nylas/accounts/${accountId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Clear account-specific localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`easemail_folders_${accountId}`);
          localStorage.removeItem(`easemail_folder_counts_${accountId}`);
        }

        setMessage({ type: 'success', text: 'Account removed successfully' });
        await fetchAccounts();
      } else {
        throw new Error('Failed to remove account');
      }
    } catch (error) {
      console.error('Remove account failed:', error);
      setMessage({ type: 'error', text: 'Failed to remove account' });
    } finally {
      setConfirmingDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Connected Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your email accounts and sync settings</p>
        </div>
        <Button onClick={() => setIsProviderSelectorOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{message.type === 'error' ? 'Error' : message.type === 'success' ? 'Success' : 'Info'}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No accounts connected</h3>
            <p className="text-muted-foreground text-center mb-4">
              Connect your first email account to get started
            </p>
            <Button onClick={() => setIsProviderSelectorOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {accounts.map(account => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: generateAvatarColor(account.emailAddress) }}
                    >
                      {getInitials(account.emailAddress)}
                    </div>
                    <div>
                      <CardTitle>{account.emailAddress}</CardTitle>
                      <CardDescription>
                        {account.folderCount} folders • {account.emailCount} emails
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {account.syncStatus && (
                      <Badge variant={
                        account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing' ? 'default' :
                        account.syncStatus === 'completed' ? 'default' :
                        account.syncStatus === 'error' ? 'destructive' :
                        'secondary'
                      }>
                        {account.syncStatus === 'syncing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        {account.syncStatus === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {account.syncStatus === 'error' && <XCircle className="h-3 w-3 mr-1" />}
                        {account.syncStatus.replace('_', ' ').toUpperCase()}
                      </Badge>
                    )}
                    {confirmingDelete === account.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteAccount(account.id)}>
                          Confirm
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirmingDelete(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(account.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Sync Dashboard */}
                {(account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing') && syncMetrics[account.id] && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                          Syncing emails...
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                          {syncMetrics[account.id].syncProgress}%
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStopSync(account.id)}
                          className="text-orange-600 border-orange-300"
                        >
                          <StopCircle className="h-3.5 w-3.5 mr-1.5" />
                          Stop
                        </Button>
                      </div>
                    </div>

                    <Progress value={syncMetrics[account.id].syncProgress} className="h-3 mb-3" />

                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-blue-700 dark:text-blue-300 font-medium">
                        {syncMetrics[account.id].syncedEmailCount.toLocaleString()} emails synced
                      </span>
                      {syncMetrics[account.id].totalEmailCount > 0 && (
                        <span className="text-blue-600 dark:text-blue-400 text-xs">
                          of ~{syncMetrics[account.id].totalEmailCount.toLocaleString()} total
                        </span>
                      )}
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                          <Zap className="h-3 w-3" />
                          Rate
                        </div>
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                          {syncMetrics[account.id].emailsPerMinute > 0
                            ? `${syncMetrics[account.id].emailsPerMinute}/min`
                            : 'Calculating...'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                          <Clock className="h-3 w-3" />
                          ETA
                        </div>
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                          {syncMetrics[account.id].estimatedTimeRemaining
                            ? syncMetrics[account.id].estimatedTimeRemaining! < 60
                              ? `${syncMetrics[account.id].estimatedTimeRemaining}m`
                              : `${Math.floor(syncMetrics[account.id].estimatedTimeRemaining! / 60)}h ${syncMetrics[account.id].estimatedTimeRemaining! % 60}m`
                            : 'Calculating...'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                          <TrendingUp className="h-3 w-3" />
                          Progress
                        </div>
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                          {syncMetrics[account.id].continuationCount} / 100
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                          <Database className="h-3 w-3" />
                          Page
                        </div>
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                          {syncMetrics[account.id].currentPage} / {syncMetrics[account.id].maxPages}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 pt-3 mt-3 border-t border-blue-200 dark:border-blue-800">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      <span>Live sync in progress</span>
                    </div>
                  </div>
                )}

                {/* Error Alert */}
                {account.lastError && account.syncStatus === 'error' && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Sync Error</AlertTitle>
                    <AlertDescription>{account.lastError}</AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {account.syncStatus !== 'syncing' && account.syncStatus !== 'background_syncing' && (
                    <Button
                      onClick={() => handleSyncAccount(account.id)}
                      disabled={syncing[account.id]}
                    >
                      {syncing[account.id] ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Sync Now
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProviderSelector
        isOpen={isProviderSelectorOpen}
        onClose={() => setIsProviderSelectorOpen(false)}
      />
    </div>
  );
}
