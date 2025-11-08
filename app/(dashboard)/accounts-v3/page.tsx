'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Trash2, CheckCircle, XCircle, Loader2, Mail, StopCircle, AlertCircle,
  TrendingUp, Database, Zap, Clock, Pause, Play, Activity, BarChart3,
  RefreshCw, Shield, Wifi, WifiOff, Settings, Eye, Calendar, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getInitials, generateAvatarColor } from '@/lib/utils';
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
  autoSync?: boolean;
  syncStopped?: boolean;
  isActive?: boolean;
  createdAt?: string;
  storageUsed?: number;
  storageLimit?: number;
  webhookStatus?: string;
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
  initialSyncCompleted: boolean;
  lastSyncedAt: string | null;
}

interface AccountStats {
  totalAccounts: number;
  activeAccounts: number;
  syncingAccounts: number;
  totalEmails: number;
  totalStorage: number;
  avgSyncProgress: number;
}

export default function AccountsV3Page() {
  // State
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [isProviderSelectorOpen, setIsProviderSelectorOpen] = useState(false);
  const [syncMetrics, setSyncMetrics] = useState<Record<string, SyncMetrics>>({});
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

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

  // Background polling for auto-sync accounts (check every 5 minutes)
  useEffect(() => {
    const AUTO_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

    const checkAutoSync = async () => {
      const autoSyncAccounts = accounts.filter(a => a.autoSync && !a.syncStopped && a.syncStatus === 'idle');

      if (autoSyncAccounts.length > 0) {
        console.log(`🔄 Auto-syncing ${autoSyncAccounts.length} accounts...`);

        for (const account of autoSyncAccounts) {
          try {
            await fetch(`/api/nylas/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accountId: account.id }),
            });
          } catch (error) {
            console.error(`Auto-sync failed for ${account.emailAddress}:`, error);
          }
        }
      }
    };

    const interval = setInterval(checkAutoSync, AUTO_SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [accounts]);

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
      console.log('Fetching accounts...');
      const response = await fetch('/api/nylas/accounts');
      console.log('Accounts response:', response.status);
      const data = await response.json();
      console.log('Accounts data:', data);

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
      } else {
        console.error('Accounts fetch failed:', data);
        setAccounts([]);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      setMessage({ type: 'error', text: 'Failed to load accounts' });
      setAccounts([]);
    } finally {
      console.log('Setting loading to false');
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
              syncStopped: false,
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

      // Trigger background sync
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

  const handlePauseSync = async (accountId: string) => {
    try {
      const response = await fetch('/api/nylas/sync/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      if (response.ok) {
        setMessage({ type: 'info', text: 'Sync paused' });
        setAccounts(prev => prev.map(a =>
          a.id === accountId ? { ...a, syncStopped: true, syncStatus: 'idle' } : a
        ));
      }
    } catch (error) {
      console.error('Pause sync failed:', error);
      setMessage({ type: 'error', text: 'Failed to pause sync' });
    }
  };

  const handleResumeSync = async (accountId: string) => {
    try {
      const response = await fetch('/api/nylas/sync/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Sync resumed' });
        await handleSyncAccount(accountId);
      }
    } catch (error) {
      console.error('Resume sync failed:', error);
      setMessage({ type: 'error', text: 'Failed to resume sync' });
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

  const handleToggleAutoSync = async (accountId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/nylas/accounts/${accountId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoSync: enabled }),
      });

      if (response.ok) {
        setAccounts(prev => prev.map(a =>
          a.id === accountId ? { ...a, autoSync: enabled } : a
        ));
        setMessage({ type: 'success', text: `Auto-sync ${enabled ? 'enabled' : 'disabled'}` });
      }
    } catch (error) {
      console.error('Failed to toggle auto-sync:', error);
      setMessage({ type: 'error', text: 'Failed to update settings' });
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

  const handleRefreshCounts = async () => {
    setMessage({ type: 'info', text: 'Refreshing account data...' });
    try {
      await fetchAccounts();
      setMessage({ type: 'success', text: 'Account data refreshed successfully' });
    } catch (error) {
      console.error('Refresh failed:', error);
      setMessage({ type: 'error', text: 'Failed to refresh account data' });
    }
  };

  const handleActivateWebhooks = async (accountId: string) => {
    setMessage({ type: 'info', text: 'Activating webhooks...' });
    try {
      const response = await fetch(`/api/nylas/accounts/${accountId}/webhooks/activate`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Webhooks activated successfully! Your account will now receive real-time updates.' });
        await fetchAccounts();
      } else {
        // Show more detailed error message if available
        const errorMsg = data.suggestion
          ? `${data.message}\n\n${data.suggestion}`
          : data.message || data.error || 'Failed to activate webhooks';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Webhook activation failed:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to activate webhooks' });
    }
  };

  // Calculate aggregate stats
  const stats: AccountStats = {
    totalAccounts: accounts.length,
    activeAccounts: accounts.filter(a => a.isActive).length,
    syncingAccounts: accounts.filter(a => a.syncStatus === 'syncing' || a.syncStatus === 'background_syncing').length,
    totalEmails: accounts.reduce((sum, a) => sum + (a.emailCount || 0), 0),
    totalStorage: accounts.reduce((sum, a) => sum + (a.storageUsed || 0), 0),
    avgSyncProgress: accounts.length > 0
      ? Math.round(accounts.reduce((sum, a) => sum + (a.syncProgress || 0), 0) / accounts.length)
      : 0,
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <a
              href="/inbox-v3"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Inbox
            </a>
          </div>
          <h1 className="text-3xl font-bold">Account Management</h1>
          <p className="text-muted-foreground mt-1">Monitor, sync, and manage your connected email accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefreshCounts} variant="outline" size="lg">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsProviderSelectorOpen(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{message.type === 'error' ? 'Error' : message.type === 'success' ? 'Success' : 'Info'}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Overview Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Accounts</CardDescription>
            <CardTitle className="text-3xl">{stats.totalAccounts}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <Shield className="h-3 w-3 mr-1" />
              {stats.activeAccounts} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Currently Syncing</CardDescription>
            <CardTitle className="text-3xl">{stats.syncingAccounts}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.syncingAccounts > 0 ? (
                <>
                  <Activity className="h-3 w-3 mr-1 animate-pulse" />
                  Active syncs running
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  All syncs idle
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Emails</CardDescription>
            <CardTitle className="text-3xl">{stats.totalEmails.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <Mail className="h-3 w-3 mr-1" />
              Across all accounts
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Storage Used</CardDescription>
            <CardTitle className="text-3xl">{formatBytes(stats.totalStorage)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <Database className="h-3 w-3 mr-1" />
              Total storage
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="details">
            <Eye className="h-4 w-4 mr-2" />
            Detailed View
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {accounts.map(account => (
                <Card key={account.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: generateAvatarColor(account.emailAddress) }}
                        >
                          {getInitials(account.emailAddress)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{account.emailAddress}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <span>{account.folderCount} folders</span>
                            <span>•</span>
                            <span>{account.emailCount?.toLocaleString()} emails</span>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {account.webhookStatus === 'active' ? (
                          <Wifi className="h-4 w-4 text-green-600" title="Webhooks active" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-orange-600" title="Webhooks inactive" />
                        )}
                        {account.syncStatus && (
                          <Badge variant={
                            account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing' ? 'default' :
                            account.syncStatus === 'completed' ? 'secondary' :
                            account.syncStatus === 'error' ? 'destructive' :
                            'outline'
                          }>
                            {account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing' ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : account.syncStatus === 'completed' ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : account.syncStatus === 'error' ? (
                              <XCircle className="h-3 w-3 mr-1" />
                            ) : null}
                            {account.syncStatus.replace('_', ' ').toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Sync Progress */}
                    {(account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing') && syncMetrics[account.id] && (
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                              Syncing...
                            </span>
                          </div>
                          <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                            {syncMetrics[account.id].syncProgress}%
                          </span>
                        </div>

                        <Progress value={syncMetrics[account.id].syncProgress} className="h-2" />

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <div className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              Rate
                            </div>
                            <div className="font-bold text-blue-700 dark:text-blue-300">
                              {syncMetrics[account.id].emailsPerMinute}/min
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              ETA
                            </div>
                            <div className="font-bold text-blue-700 dark:text-blue-300">
                              {syncMetrics[account.id].estimatedTimeRemaining ? `${syncMetrics[account.id].estimatedTimeRemaining}m` : 'Calculating...'}
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              Synced
                            </div>
                            <div className="font-bold text-blue-700 dark:text-blue-300">
                              {syncMetrics[account.id].syncedEmailCount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error Alert */}
                    {account.lastError && account.syncStatus === 'error' && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Sync Error</AlertTitle>
                        <AlertDescription className="text-xs">{account.lastError}</AlertDescription>
                      </Alert>
                    )}

                    {/* Account Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs mb-1">Last Synced</div>
                        <div className="font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(account.lastSyncedAt)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs mb-1">Storage</div>
                        <div className="font-medium flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {formatBytes(account.storageUsed || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Auto-Sync Toggle */}
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor={`auto-sync-${account.id}`} className="cursor-pointer">
                          Auto-sync
                        </Label>
                      </div>
                      <Switch
                        id={`auto-sync-${account.id}`}
                        checked={account.autoSync ?? true}
                        onCheckedChange={(checked) => handleToggleAutoSync(account.id, checked)}
                      />
                    </div>

                    {/* Webhook Status & Activation */}
                    {account.webhookStatus !== 'active' && (
                      <Alert className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
                        <WifiOff className="h-4 w-4 text-orange-600" />
                        <AlertTitle>Real-time notifications disabled</AlertTitle>
                        <AlertDescription className="flex items-center justify-between">
                          <span className="text-sm">Enable webhooks to receive instant updates when new emails arrive</span>
                          <Button
                            onClick={() => handleActivateWebhooks(account.id)}
                            size="sm"
                            className="ml-2"
                          >
                            <Wifi className="h-3 w-3 mr-1" />
                            Activate
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {account.syncStopped ? (
                        <Button
                          onClick={() => handleResumeSync(account.id)}
                          className="flex-1"
                          variant="outline"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Resume Sync
                        </Button>
                      ) : account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing' ? (
                        <>
                          <Button
                            onClick={() => handlePauseSync(account.id)}
                            variant="outline"
                            className="flex-1"
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </Button>
                          <Button
                            onClick={() => handleStopSync(account.id)}
                            variant="outline"
                            className="text-orange-600"
                          >
                            <StopCircle className="h-4 w-4 mr-2" />
                            Stop
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => handleSyncAccount(account.id)}
                          disabled={syncing[account.id]}
                          className="flex-1"
                        >
                          {syncing[account.id] ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Starting...
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
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedAccount(account.id)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>

                      {confirmingDelete === account.id ? (
                        <>
                          <Button size="icon" variant="destructive" onClick={() => handleDeleteAccount(account.id)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="outline" onClick={() => setConfirmingDelete(null)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button size="icon" variant="ghost" onClick={() => setConfirmingDelete(account.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Account Information</CardTitle>
              <CardDescription>Comprehensive view of all account metrics and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accounts.map(account => (
                  <div key={account.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{account.emailAddress}</h3>
                      <Badge variant={account.isActive ? 'default' : 'secondary'}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Provider</div>
                        <div className="font-medium">{account.nylasProvider || account.emailProvider || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Sync Progress</div>
                        <div className="font-medium">{account.syncProgress || 0}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Initial Sync</div>
                        <div className="font-medium">{account.initialSyncCompleted ? 'Completed' : 'Pending'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Webhook Status</div>
                        <div className="font-medium capitalize">{account.webhookStatus || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Total Emails</div>
                        <div className="font-medium">{account.emailCount?.toLocaleString() || 0}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Synced Emails</div>
                        <div className="font-medium">{account.syncedEmailCount?.toLocaleString() || 0}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Storage</div>
                        <div className="font-medium">{formatBytes(account.storageUsed || 0)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Created</div>
                        <div className="font-medium">{account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Account Activity</CardTitle>
              <CardDescription>Recent sync history and account events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Activity logging coming soon</p>
                <p className="text-sm mt-2">Track sync history, errors, and account changes</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProviderSelector
        isOpen={isProviderSelectorOpen}
        onClose={() => setIsProviderSelectorOpen(false)}
      />
    </div>
  );
}
