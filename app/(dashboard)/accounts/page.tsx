'use client';

import { useState, useEffect, Suspense } from 'react';
import { Plus, RefreshCw, Trash2, CheckCircle, XCircle, Loader2, Mail, Folder, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getInitials, generateAvatarColor } from '@/lib/utils';
import InboxLayout from '@/components/layout/InboxLayout';
import InlineMessage from '@/components/ui/inline-message';

interface EmailAccount {
  id: string;
  emailAddress: string;
  emailProvider: string;
  nylasProvider?: string;
  syncStatus: string;
  lastSyncedAt?: string;
  lastError?: string;
  isDefault: boolean;
  isActive: boolean;
  autoSync: boolean;
  folderCount?: number;
  emailCount?: number;
  syncProgress?: number;
  totalEmailCount?: number;
  syncedEmailCount?: number;
  initialSyncCompleted?: boolean;
}

function AccountsContent() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
    
    // Start with faster polling
    const interval = setInterval(() => {
      checkSyncStatus();
    }, 2000); // Poll every 2 seconds for real-time updates
    
    return () => clearInterval(interval);
  }, []);

  const checkSyncStatus = async () => {
    // Only check status for accounts that are syncing or background_syncing
    const syncingAccounts = accounts.filter(a => 
      a.syncStatus === 'syncing' || 
      a.syncStatus === 'background_syncing'
    );

    if (syncingAccounts.length === 0) return;

    for (const account of syncingAccounts) {
      try {
        const response = await fetch(`/api/nylas/sync/background?accountId=${account.id}`);
        const data = await response.json();
        
        if (data.success) {
          // Update account with new sync status
          setAccounts(prev => prev.map(a => 
            a.id === account.id 
              ? { 
                  ...a, 
                  syncStatus: data.syncStatus,
                  syncProgress: data.progress,
                  totalEmailCount: data.totalEmailCount,
                  syncedEmailCount: data.syncedEmailCount,
                  initialSyncCompleted: data.initialSyncCompleted,
                  lastSyncedAt: data.lastSyncedAt,
                }
              : a
          ));
        }
      } catch (error) {
        console.error(`Failed to check sync status for ${account.id}:`, error);
      }
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/nylas/accounts');
      const data = await response.json();
      
      if (data.success) {
        // Fetch stats for each account
        const accountsWithStats = await Promise.all(
          data.accounts.map(async (account: EmailAccount) => {
            try {
              const statsResponse = await fetch(`/api/nylas/accounts/${account.id}/stats`);
              const stats = await statsResponse.json();
              return {
                ...account,
                folderCount: stats.folderCount || 0,
                emailCount: stats.emailCount || 0,
              };
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

  const handleAddAccount = () => {
    window.location.href = '/api/nylas/auth?provider=google';
  };

  const handleSyncAccount = async (accountId: string) => {
    setSyncing({ ...syncing, [accountId]: true });
    
    try {
      // Sync folders first
      await fetch(`/api/nylas/folders/sync?accountId=${accountId}`, {
        method: 'POST',
      });
      
      // Sync initial batch of messages (1000)
      await fetch('/api/nylas/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, limit: 1000, fullSync: true }),
      });
      
      // Trigger background sync for remaining emails
      fetch('/api/nylas/sync/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      }).catch(err => console.error('Background sync trigger error:', err));
      
      setMessage({ type: 'success', text: 'Sync started - initial emails synced, background sync running' });
      
      // Refresh accounts
      await fetchAccounts();
    } catch (error) {
      console.error('Sync failed:', error);
      setMessage({ type: 'error', text: 'Failed to sync account' });
    } finally {
      setSyncing({ ...syncing, [accountId]: false });
    }
  };

  const handleStopSync = async (accountId: string) => {
    try {
      // Call stop sync API
      const response = await fetch('/api/nylas/sync/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'info', text: 'Sync stopped - you can resume by clicking Sync Now' });
        // Refresh accounts to update status
        await fetchAccounts();
      } else {
        throw new Error(data.error || 'Failed to stop sync');
      }
    } catch (error) {
      console.error('Stop sync failed:', error);
      setMessage({ type: 'error', text: 'Failed to stop sync' });
    }
  };

  const handleRemoveAccount = async (accountId: string, email: string) => {
    // First click: ask for confirmation inline
    if (confirmingDelete !== accountId) {
      setConfirmingDelete(accountId);
      setMessage({ 
        type: 'error', 
        text: `Are you sure you want to remove ${email}? All emails and folders will be deleted. Click Remove again to confirm.` 
      });
      return;
    }

    // Second click: actually delete
    setConfirmingDelete(null);
    
    try {
      const response = await fetch(`/api/nylas/accounts/${accountId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Account removed successfully' });
        await fetchAccounts();
      } else {
        throw new Error('Failed to remove account');
      }
    } catch (error) {
      console.error('Remove account failed:', error);
      setMessage({ type: 'error', text: 'Failed to remove account' });
    }
  };

  const getStatusIcon = (status: string, progress?: number) => {
    switch (status) {
      case 'active':
      case 'completed':
        return (
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping opacity-75" />
            </div>
            <span className="text-xs font-medium text-green-600 dark:text-green-400">Active</span>
          </div>
        );
      case 'syncing':
      case 'background_syncing':
        return (
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
              <div className="absolute inset-0 h-3 w-3 rounded-full bg-blue-500 animate-ping opacity-75" />
            </div>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Syncing {progress}%</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <div className="absolute inset-0 h-3 w-3 rounded-full bg-red-500 animate-ping opacity-75" />
            </div>
            <span className="text-xs font-medium text-red-600 dark:text-red-400">Error</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
              <div className="absolute inset-0 h-3 w-3 rounded-full bg-yellow-500 animate-ping opacity-75" />
            </div>
            <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Pending</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-400" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Inactive</span>
          </div>
        );
    }
  };

  const formatLastSync = (date?: string) => {
    if (!date) return 'Never synced';
    const syncDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return (
    <InboxLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Email Accounts</h1>
            <p className="text-muted-foreground mt-2">
              Manage your connected email accounts and sync settings
            </p>
          </div>
          <Button onClick={handleAddAccount}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>

        {message && (
          <InlineMessage
            type={message.type}
            message={message.text}
            onClose={() => setMessage(null)}
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No accounts connected</h3>
              <p className="text-muted-foreground mb-6">
                Add your first email account to get started
              </p>
              <Button onClick={handleAddAccount}>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium text-white"
                        style={{ backgroundColor: generateAvatarColor(account.emailAddress) }}
                      >
                        {getInitials(account.emailAddress)}
                      </div>
                      <div>
                        <CardTitle className="text-xl">{account.emailAddress}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <span className="capitalize">
                            {account.emailProvider || account.nylasProvider}
                          </span>
                          {account.isDefault && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                              Default
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(syncing[account.id] ? 'syncing' : account.syncStatus, account.syncProgress)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Error Message Display */}
                  {account.syncStatus === 'error' && account.lastError && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                            Sync Error
                          </h4>
                          <p className="text-sm text-red-700 dark:text-red-400">
                            {account.lastError}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar for Background Sync */}
                  {(account.syncStatus === 'background_syncing' || account.syncStatus === 'syncing') && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            Syncing emails in background...
                          </span>
                        </div>
                        <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                          {account.syncProgress || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 h-3 rounded-full transition-all duration-500 ease-out relative"
                          style={{ width: `${account.syncProgress || 0}%` }}
                        >
                          <div className="absolute inset-0 bg-white/30 animate-pulse" />
                        </div>
                      </div>
                      {account.syncedEmailCount !== undefined && (
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-700 dark:text-blue-300 font-medium">
                              📧 {account.syncedEmailCount.toLocaleString()} emails synced
                            </span>
                            {account.totalEmailCount && (
                              <span className="text-blue-600 dark:text-blue-400 text-xs">
                                of ~{account.totalEmailCount.toLocaleString()} total
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                            <div className="flex items-center gap-1">
                              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                              <span>Live sync in progress</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-6 mb-4 pb-4 border-b border-border">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-1">Status</p>
                      <div className="mt-1">
                        {getStatusIcon(syncing[account.id] ? 'syncing' : account.syncStatus, account.syncProgress)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase mb-1">Folders</p>
                          <p className="text-sm font-medium">{account.folderCount || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase mb-1">Emails</p>
                          <p className="text-sm font-medium">
                            {(account.syncedEmailCount || account.emailCount || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <p>Last synced: {formatLastSync(account.lastSyncedAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      {/* Show Stop Sync button when actively syncing */}
                      {(account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing') ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStopSync(account.id)}
                          className="text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                        >
                          <StopCircle className="h-4 w-4 mr-2" />
                          Stop Sync
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncAccount(account.id)}
                          disabled={syncing[account.id]}
                        >
                          {syncing[account.id] ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Sync Now
                            </>
                          )}
                        </Button>
                      )}
                      <Button 
                        variant={confirmingDelete === account.id ? "destructive" : "outline"}
                        size="sm" 
                        className={confirmingDelete === account.id ? "" : "text-destructive hover:bg-destructive/10"}
                        onClick={() => handleRemoveAccount(account.id, account.emailAddress)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {confirmingDelete === account.id ? "Click Again to Confirm" : "Remove"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </InboxLayout>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <AccountsContent />
    </Suspense>
  );
}

