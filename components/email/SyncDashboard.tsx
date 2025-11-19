'use client';

import {
  Loader2,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  StopCircle,
  TrendingUp,
  Database,
  CloudDownload,
  Zap,
  Folder,
  AlertCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ErrorResolutionCard from '@/components/email/ErrorResolutionCard';
import { withRetry, isRateLimitError } from '@/lib/rate-limit-handler';
import { SyncDashboardSkeleton } from '@/components/ui/skeleton';

interface SyncDashboardProps {
  accountId: string;
  emailAddress?: string;
}

interface SyncMetrics {
  syncStatus: string;
  syncProgress: number;
  syncedEmailCount: number;
  totalEmailCount: number;
  lastSyncedAt: string | null;
  initialSyncCompleted: boolean;
  lastError: string | null;
  continuationCount: number;
  retryCount: number;
  estimatedTimeRemaining?: number;
  emailsPerMinute?: number;
  currentPage?: number;
  maxPages?: number;
  foldersSynced?: number;
  totalFolders?: number;
}

export default function SyncDashboard({ accountId, emailAddress }: SyncDashboardProps) {
  const [metrics, setMetrics] = useState<SyncMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Poll for sync status
  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        const data = await withRetry(
          async () => {
            const response = await fetch(`/api/nylas/sync/metrics?accountId=${accountId}`);

            // Handle rate limits gracefully
            if (response.status === 429) {
              console.log('Rate limited while fetching metrics, will retry...');
              const error: any = new Error('Rate limit exceeded');
              error.status = 429;
              error.response = response;
              throw error;
            }

            return response.json();
          },
          {
            maxRetries: 3,
            initialDelayMs: 2000,
            backoffMultiplier: 2,
          }
        );

        if (data.success) {
          setMetrics(data.metrics);
          setLastUpdateTime(new Date());

          // ✅ NEW: Auto-resume if sync is in pending_resume state
          if (data.metrics.syncStatus === 'pending_resume') {
            console.log('🔄 Sync is pending resume, triggering auto-resume...');
            try {
              await fetch('/api/nylas/sync/auto-resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
              });
            } catch (resumeError) {
              console.error('Failed to trigger auto-resume:', resumeError);
            }
          }
        }
      } catch (error) {
        // Don't log rate limit errors as they're handled automatically
        if (!isRateLimitError(error)) {
          console.error('Failed to fetch sync metrics:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    // Poll every 2 seconds for real-time updates
    const interval = setInterval(fetchMetrics, 2000);

    return () => clearInterval(interval);
  }, [accountId]);

  const handleStopSync = async () => {
    setStopping(true);
    try {
      await withRetry(
        async () => {
          const response = await fetch('/api/nylas/sync/stop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId }),
          });

          if (!response.ok) {
            const error: any = new Error('Stop sync failed');
            error.status = response.status;
            error.response = response;
            throw error;
          }

          return response.json();
        },
        {
          maxRetries: 3,
          initialDelayMs: 1000,
        }
      );

      // Refresh metrics immediately
      const data = await withRetry(
        async () => {
          const response = await fetch(`/api/nylas/sync/metrics?accountId=${accountId}`);
          return response.json();
        },
        { maxRetries: 2 }
      );

      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      if (!isRateLimitError(error)) {
        console.error('Stop sync failed:', error);
      }
    } finally {
      setStopping(false);
    }
  };

  const handleRestartSync = async () => {
    setRestarting(true);
    try {
      await withRetry(
        async () => {
          const response = await fetch('/api/nylas/sync/background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId }),
          });

          if (!response.ok) {
            const error: any = new Error('Restart sync failed');
            error.status = response.status;
            error.response = response;
            throw error;
          }

          return response.json();
        },
        {
          maxRetries: 3,
          initialDelayMs: 1000,
        }
      );

      // Refresh metrics immediately
      const data = await withRetry(
        async () => {
          const response = await fetch(`/api/nylas/sync/metrics?accountId=${accountId}`);
          return response.json();
        },
        { maxRetries: 2 }
      );

      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      if (!isRateLimitError(error)) {
        console.error('Restart sync failed:', error);
      }
    } finally {
      setRestarting(false);
    }
  };

  if (loading) {
    return <SyncDashboardSkeleton />;
  }

  if (!metrics) {
    return null;
  }

  const isSyncing = metrics.syncStatus === 'syncing' || metrics.syncStatus === 'background_syncing';
  const hasError = metrics.syncStatus === 'error';
  const isCompleted = metrics.syncStatus === 'completed';
  const isIdle = metrics.syncStatus === 'idle';
  const isPendingResume = metrics.syncStatus === 'pending_resume';

  // Calculate sync rate
  const syncRate = metrics.emailsPerMinute || 0;
  const remainingEmails = (metrics.totalEmailCount || 0) - metrics.syncedEmailCount;
  const estimatedMinutes = syncRate > 0 ? Math.ceil(remainingEmails / syncRate) : null;

  return (
    <div className="space-y-6 p-6">
      {/* Header with Account Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Sync Dashboard</h2>
          {emailAddress && (
            <p className="text-sm text-muted-foreground">{emailAddress}</p>
          )}
        </div>

        {/* Status Badge */}
        <Badge
          variant={
            isSyncing ? 'default' :
            isPendingResume ? 'default' :
            hasError ? 'destructive' :
            isCompleted ? 'default' :
            'secondary'
          }
          className={
            isSyncing ? 'bg-blue-500 hover:bg-blue-600' :
            isPendingResume ? 'bg-yellow-500 hover:bg-yellow-600' :
            isCompleted ? 'bg-green-500 hover:bg-green-600' :
            ''
          }
        >
          {isSyncing && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          {isPendingResume && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
          {hasError && <XCircle className="h-3 w-3 mr-1" />}
          {isCompleted && <CheckCircle className="h-3 w-3 mr-1" />}
          {isIdle && <Clock className="h-3 w-3 mr-1" />}
          {isPendingResume ? 'RESUMING' : metrics.syncStatus.toUpperCase()}
        </Badge>
      </div>

      {/* Error Alert with Resolution Guide */}
      {hasError && metrics.lastError && (
        <ErrorResolutionCard
          errorMessage={metrics.lastError}
          accountId={accountId}
          onRetry={handleRestartSync}
        />
      )}

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Sync Progress
          </CardTitle>
          <CardDescription>
            Real-time sync status and metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-semibold">{metrics.syncProgress}%</span>
            </div>
            <Progress value={metrics.syncProgress} className="h-3" />
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Synced Emails */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                Synced
              </div>
              <p className="text-2xl font-bold">{metrics.syncedEmailCount.toLocaleString()}</p>
            </div>

            {/* Total Emails */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                Total
              </div>
              <p className="text-2xl font-bold">
                {metrics.totalEmailCount > 0
                  ? metrics.totalEmailCount.toLocaleString()
                  : '~50,000'}
              </p>
              {metrics.totalEmailCount === 0 && (
                <p className="text-xs text-muted-foreground">Estimated</p>
              )}
            </div>

            {/* Sync Rate */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                Rate
              </div>
              <p className="text-2xl font-bold">
                {syncRate > 0 ? syncRate.toLocaleString() : '-'}
              </p>
              {syncRate > 0 && (
                <p className="text-xs text-muted-foreground">emails/min</p>
              )}
            </div>

            {/* Time Remaining */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                ETA
              </div>
              <p className="text-2xl font-bold">
                {estimatedMinutes !== null && isSyncing
                  ? estimatedMinutes < 60
                    ? `${estimatedMinutes}m`
                    : `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
                  : '-'}
              </p>
              {estimatedMinutes !== null && isSyncing && (
                <p className="text-xs text-muted-foreground">remaining</p>
              )}
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Continuations</span>
              <span className="text-sm font-medium">
                {metrics.continuationCount} / 100
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Retry Count</span>
              <span className="text-sm font-medium">
                {metrics.retryCount} / 3
              </span>
            </div>

            {metrics.currentPage !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Page</span>
                <span className="text-sm font-medium">
                  {metrics.currentPage} / {metrics.maxPages || 1000}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Update</span>
              <span className="text-sm font-medium">
                {metrics.lastSyncedAt
                  ? new Date(metrics.lastSyncedAt).toLocaleTimeString()
                  : 'Never'}
              </span>
            </div>
          </div>

          {/* Warnings */}
          {metrics.continuationCount > 50 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Long Sync Duration</AlertTitle>
              <AlertDescription>
                This sync has been running for over {Math.round(metrics.continuationCount * 4 / 60)} hours.
                Large mailboxes may take several hours to sync completely.
              </AlertDescription>
            </Alert>
          )}

          {metrics.retryCount > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Sync Retries Detected</AlertTitle>
              <AlertDescription>
                The sync encountered {metrics.retryCount} error(s) and automatically retried.
                If errors persist, please check your email provider connection.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Folder Sync Status */}
      {(metrics.foldersSynced !== undefined || metrics.totalFolders !== undefined) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Folder Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Folders Synced</span>
                <span className="font-semibold">
                  {metrics.foldersSynced} / {metrics.totalFolders}
                </span>
              </div>
              <Progress
                value={(metrics.totalFolders && metrics.totalFolders > 0)
                  ? ((metrics.foldersSynced || 0) / metrics.totalFolders) * 100
                  : 0
                }
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {isSyncing && (
          <Button
            variant="destructive"
            onClick={handleStopSync}
            disabled={stopping}
          >
            {stopping ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Stopping...
              </>
            ) : (
              <>
                <StopCircle className="h-4 w-4 mr-2" />
                Stop Sync
              </>
            )}
          </Button>
        )}

        {(hasError || isIdle || isCompleted) && (
          <Button
            onClick={handleRestartSync}
            disabled={restarting}
          >
            {restarting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {isCompleted ? 'Sync Again' : 'Start Sync'}
              </>
            )}
          </Button>
        )}

        <Button variant="outline" asChild>
          <a href="/accounts">
            <Mail className="h-4 w-4 mr-2" />
            Manage Accounts
          </a>
        </Button>
      </div>

      {/* Real-time Status */}
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${isSyncing ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        {isSyncing ? 'Live sync in progress' : 'Monitoring paused'}
        <span className="ml-2">
          Last updated: {lastUpdateTime.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
