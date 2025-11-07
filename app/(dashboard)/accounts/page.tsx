'use client';

import { useState, useEffect, Suspense } from 'react';
import { Plus, RefreshCw, Trash2, CheckCircle, XCircle, Loader2, Mail, Folder, StopCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getInitials, generateAvatarColor } from '@/lib/utils';
import InboxLayout from '@/components/layout/InboxLayout';
import InlineMessage from '@/components/ui/inline-message';
import ProviderSelector from '@/components/email/ProviderSelector';

// Helper functions for better error messages
function getErrorTitle(error: string): string {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('service unavailable') || lowerError.includes('503')) {
    return 'Connection Issue';
  }
  if (lowerError.includes('timeout') || lowerError.includes('etimedout')) {
    return 'Sync Taking Longer Than Expected';
  }
  if (lowerError.includes('token') || lowerError.includes('auth') || lowerError.includes('401') || lowerError.includes('403')) {
    return 'Account Needs Reconnection';
  }
  if (lowerError.includes('rate limit') || lowerError.includes('429')) {
    return 'Too Many Requests';
  }
  if (lowerError.includes('network') || lowerError.includes('connection')) {
    return 'Network Issue';
  }
  
  return 'Sync Paused';
}

function getErrorMessage(error: string): string {
  const lowerError = error.toLowerCase();
  
  // ✅ SILENT TOKEN MANAGEMENT: Only show reconnect message after ALL retries failed
  if (lowerError.includes('needs reconnection') || lowerError.includes('account needs reconnection')) {
    return "Your email account needs to be reconnected. This takes just 30 seconds and keeps your emails secure.";
  }
  
  if (lowerError.includes('service unavailable') || lowerError.includes('503')) {
    return "We're having trouble reaching the email service. This is usually temporary and resolves in a few minutes. Your emails are safe.";
  }
  if (lowerError.includes('timeout') || lowerError.includes('etimedout')) {
    return "Your mailbox is large and sync is taking longer than expected. We'll keep trying in the background.";
  }
  if (lowerError.includes('token') || lowerError.includes('auth') || lowerError.includes('401') || lowerError.includes('403')) {
    return "Your email provider requires you to sign in again. This is normal and helps keep your account secure.";
  }
  if (lowerError.includes('rate limit') || lowerError.includes('429')) {
    return "We're syncing too fast. We'll automatically slow down and resume shortly. Your emails are safe.";
  }
  if (lowerError.includes('network') || lowerError.includes('connection')) {
    return "Can't reach the email server. Check your internet connection and we'll retry automatically.";
  }
  
  return `${error.substring(0, 200)}... We're investigating this issue and will retry automatically.`;
}

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
  const [isProviderSelectorOpen, setIsProviderSelectorOpen] = useState(false);
  const [syncMetrics, setSyncMetrics] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Separate effect for polling that depends on accounts
  useEffect(() => {
    if (accounts.length === 0) return;

    // Check immediately
    checkSyncStatus();

    // Start with faster polling
    const interval = setInterval(() => {
      checkSyncStatus();
    }, 2000); // Poll every 2 seconds for real-time updates

    return () => clearInterval(interval);
  }, [accounts]);

  const checkSyncStatus = async () => {
    // Only check status for accounts that are syncing or background_syncing
    const syncingAccounts = accounts.filter(a =>
      a.syncStatus === 'syncing' ||
      a.syncStatus === 'background_syncing'
    );

    if (syncingAccounts.length === 0) return;

    for (const account of syncingAccounts) {
      try {
        // Fetch detailed metrics from the metrics API
        const metricsResponse = await fetch(`/api/nylas/sync/metrics?accountId=${account.id}`);
        const metricsData = await metricsResponse.json();

        if (metricsData.success) {
          // Update sync metrics for this account
          setSyncMetrics(prev => ({
            ...prev,
            [account.id]: metricsData.metrics
          }));

          // Update account with new sync status
          setAccounts(prev => prev.map(a =>
            a.id === account.id
              ? {
                  ...a,
                  syncStatus: metricsData.metrics.syncStatus,
                  syncProgress: metricsData.metrics.syncProgress,
                  totalEmailCount: metricsData.metrics.totalEmailCount,
                  syncedEmailCount: metricsData.metrics.syncedEmailCount,
                  initialSyncCompleted: metricsData.metrics.initialSyncCompleted,
                  lastSyncedAt: metricsData.metrics.lastSyncedAt,
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
      console.log('🔍 Fetching accounts...');
      const response = await fetch('/api/nylas/accounts');
      const data = await response.json();
      
      console.log('📦 Accounts response:', data);
      
      if (data.success) {
        console.log('✅ Found accounts:', data.accounts.length);
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
        console.log('✅ Accounts with stats:', accountsWithStats);
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
    setIsProviderSelectorOpen(true);
  };

  const handleSyncAccount = async (accountId: string) => {
    setSyncing({ ...syncing, [accountId]: true });
    setMessage(null); // Clear previous messages
    
    try {
      console.log(`🔄 Starting manual sync for account: ${accountId}`);
      
      // Sync folders first
      const folderResponse = await fetch(`/api/nylas/folders/sync?accountId=${accountId}`, {
        method: 'POST',
      });
      
      if (!folderResponse.ok) {
        const folderError = await folderResponse.text();
        console.error('❌ Folder sync failed:', folderError);
        throw new Error(`Folder sync failed: ${folderError}`);
      }
      
      console.log('✅ Folders synced');
      
      // Sync initial batch of messages (200 - Nylas max limit)
      const messagesResponse = await fetch('/api/nylas/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, limit: 200, fullSync: true }),
      });
      
      if (!messagesResponse.ok) {
        const messagesError = await messagesResponse.text();
        console.error('❌ Messages sync failed:', messagesError);
        throw new Error(`Messages sync failed: ${messagesError}`);
      }
      
      console.log('✅ Messages synced');
      
      // Trigger background sync for remaining emails
      fetch('/api/nylas/sync/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      }).catch(err => console.error('Background sync trigger error:', err));
      
      setMessage({ type: 'success', text: 'Sync restarted successfully! Emails are loading...' });
      
      // Refresh accounts
      await fetchAccounts();
      
      console.log('✅ Sync completed successfully');
    } catch (error: any) {
      console.error('❌ Sync failed:', error);
      
      // Show helpful error message
      const errorMessage = error.message || 'Failed to sync account';
      
      if (errorMessage.toLowerCase().includes('service unavailable') || errorMessage.includes('503')) {
        setMessage({ 
          type: 'error', 
          text: 'Still having connection issues. The email service may be temporarily down. Try again in a few minutes.' 
        });
      } else if (errorMessage.toLowerCase().includes('auth') || errorMessage.includes('401') || errorMessage.includes('403')) {
        setMessage({ 
          type: 'error', 
          text: 'Authentication expired. Please reconnect your account using the button below.' 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `Sync failed: ${errorMessage}. Check your internet connection and try again.` 
        });
      }
    } finally {
      setSyncing({ ...syncing, [accountId]: false });
      console.log('🏁 Sync attempt finished');
    }
  };

  // Alias for retry functionality
  const handleManualSync = handleSyncAccount;

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
        // ✅ FIX #4: Clear account-specific localStorage when account is deleted
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`easemail_folders_${accountId}`);
          localStorage.removeItem(`easemail_folder_counts_${accountId}`);
          console.log(`[Cache] Cleared localStorage for deleted account: ${accountId}`);
        }
        
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
      case 'idle': // ✅ FIXED: idle status should show as active
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
      <div className="h-full overflow-y-auto">
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
                    <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                            {getErrorTitle(account.lastError)}
                          </h4>
                          <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
                            {getErrorMessage(account.lastError)}
                          </p>
                          <div className="flex items-center gap-2">
                            {(account.lastError.toLowerCase().includes('token') || 
                              account.lastError.toLowerCase().includes('auth') ||
                              account.lastError.toLowerCase().includes('expired') ||
                              account.lastError.toLowerCase().includes('401') ||
                              account.lastError.toLowerCase().includes('403') ||
                              account.lastError.toLowerCase().includes('unauthorized')) ? (
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => window.location.href = `/api/nylas/auth?provider=${account.nylasProvider || account.emailProvider}`}
                              >
                                Reconnect Account
                              </Button>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => handleManualSync(account.id)}
                                  disabled={syncing[account.id]}
                                >
                                  {syncing[account.id] ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Retrying...
                                    </>
                                  ) : (
                                    'Retry Now'
                                  )}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => window.location.href = `/api/nylas/auth?provider=${account.nylasProvider || account.emailProvider}`}
                                >
                                  Or Reconnect
                                </Button>
                              </>
                            )}
                          </div>
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
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                            {account.syncProgress || 0}%
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStopSync(account.id)}
                            className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950"
                          >
                            <StopCircle className="h-3.5 w-3.5 mr-1.5" />
                            Stop
                          </Button>
                        </div>
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
                        <div className="mt-3 space-y-2">
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

                          {/* Enhanced Metrics Grid */}
                          {syncMetrics[account.id] && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-blue-200 dark:border-blue-800">
                              {/* Sync Rate */}
                              <div className="space-y-1">
                                <p className="text-xs text-blue-600 dark:text-blue-400">Rate</p>
                                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                  {syncMetrics[account.id].emailsPerMinute > 0
                                    ? `${syncMetrics[account.id].emailsPerMinute}/min`
                                    : 'Calculating...'}
                                </p>
                              </div>

                              {/* ETA */}
                              <div className="space-y-1">
                                <p className="text-xs text-blue-600 dark:text-blue-400">ETA</p>
                                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                  {syncMetrics[account.id].estimatedTimeRemaining
                                    ? syncMetrics[account.id].estimatedTimeRemaining < 60
                                      ? `${syncMetrics[account.id].estimatedTimeRemaining}m`
                                      : `${Math.floor(syncMetrics[account.id].estimatedTimeRemaining / 60)}h ${syncMetrics[account.id].estimatedTimeRemaining % 60}m`
                                    : 'Calculating...'}
                                </p>
                              </div>

                              {/* Continuation Count */}
                              <div className="space-y-1">
                                <p className="text-xs text-blue-600 dark:text-blue-400">Continuations</p>
                                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                  {syncMetrics[account.id].continuationCount || 0} / 100
                                </p>
                              </div>

                              {/* Current Page */}
                              <div className="space-y-1">
                                <p className="text-xs text-blue-600 dark:text-blue-400">Page</p>
                                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                  {syncMetrics[account.id].currentPage || 0} / {syncMetrics[account.id].maxPages || 1000}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 pt-1">
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
      </div>

      {/* Provider Selector Modal */}
      <ProviderSelector
        isOpen={isProviderSelectorOpen}
        onClose={() => setIsProviderSelectorOpen(false)}
      />
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

