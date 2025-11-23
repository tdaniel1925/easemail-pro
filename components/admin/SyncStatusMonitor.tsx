'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Mail,
  Clock,
  TrendingUp,
  Database,
  Activity
} from 'lucide-react';

interface SyncAccount {
  id: string;
  email: string;
  provider: string;
  syncStatus: string;
  syncedEmailCount: number;
  actualEmailCount: number;
  continuationCount: number;
  lastSyncAt: string | null;
  lastCursor: string;
  isSyncing: boolean;
  isComplete: boolean;
  hasError: boolean;
  lastError: string | null;
  estimatedSyncTime: string;
}

interface SyncStatusData {
  success: boolean;
  accounts: SyncAccount[];
  summary: {
    totalAccounts: number;
    syncing: number;
    complete: number;
    errors: number;
    totalEmailsInDB: number;
  };
}

interface SyncStatusMonitorProps {
  userId?: string; // If provided, only show this user's accounts (for user account page)
  isAdmin?: boolean; // Show admin controls
}

export function SyncStatusMonitor({ userId, isAdmin = false }: SyncStatusMonitorProps) {
  const [data, setData] = useState<SyncStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = async () => {
    try {
      setError(null);
      const url = userId
        ? `/api/sync-status?userId=${userId}`
        : '/api/sync-status';

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Failed to fetch sync status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sync status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [userId]);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStatus();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, userId]);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchStatus();
  };

  const getStatusBadge = (account: SyncAccount) => {
    if (account.hasError) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Error</Badge>;
    }
    if (account.isSyncing) {
      return <Badge variant="default" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Syncing</Badge>;
    }
    if (account.isComplete) {
      return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Complete</Badge>;
    }
    return <Badge variant="secondary">Idle</Badge>;
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return '🔵 Gmail';
      case 'microsoft':
        return '🔷 Outlook';
      case 'imap':
        return '📧 IMAP';
      default:
        return provider;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
          <Button onClick={handleManualRefresh} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Accounts</p>
                <p className="text-2xl font-bold">{data.summary.totalAccounts}</p>
              </div>
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Syncing</p>
                <p className="text-2xl font-bold">{data.summary.syncing}</p>
              </div>
              <Activity className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Complete</p>
                <p className="text-2xl font-bold">{data.summary.complete}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Emails</p>
                <p className="text-2xl font-bold">{data.summary.totalEmailsInDB.toLocaleString()}</p>
              </div>
              <Database className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account Sync Status</CardTitle>
              <CardDescription>
                Real-time monitoring of email synchronization
                {autoRefresh && ' • Auto-refreshing every 30s'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? 'Disable' : 'Enable'} Auto-refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No email accounts found
            </div>
          ) : (
            <div className="space-y-4">
              {data.accounts.map((account) => (
                <Card key={account.id} className="overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-semibold">{account.email}</p>
                            <p className="text-sm text-muted-foreground">
                              {getProviderIcon(account.provider)}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(account)}
                      </div>

                      {/* Progress Bar (only for syncing accounts) */}
                      {account.isSyncing && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Sync Progress</span>
                            <span className="font-medium">
                              {account.actualEmailCount.toLocaleString()} emails
                            </span>
                          </div>
                          <Progress value={undefined} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            Continuation #{account.continuationCount} • {account.estimatedSyncTime}
                          </p>
                        </div>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Emails in DB</p>
                          <p className="text-lg font-semibold">
                            {account.actualEmailCount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Synced Count</p>
                          <p className="text-lg font-semibold">
                            {account.syncedEmailCount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Continuations</p>
                          <p className="text-lg font-semibold flex items-center gap-1">
                            {account.continuationCount}
                            {account.isSyncing && <TrendingUp className="h-3 w-3 text-primary" />}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Sync</p>
                          <p className="text-lg font-semibold flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(account.lastSyncAt)}
                          </p>
                        </div>
                      </div>

                      {/* Cursor Status */}
                      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        Cursor: {account.lastCursor}
                      </div>

                      {/* Error Display */}
                      {account.hasError && account.lastError && (
                        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                          <p className="font-semibold mb-1">Error:</p>
                          <p>{account.lastError}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
