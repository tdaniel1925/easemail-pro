'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import ErrorResolutionCard from '@/components/email/ErrorResolutionCard';

interface SyncDiagnosticProps {
  accountId: string;
}

export function SyncDiagnostic({ accountId }: SyncDiagnosticProps) {
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [restarting, setRestarting] = useState(false);
  const { confirm, Dialog } = useConfirm();
  const { toast } = useToast();

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/nylas/sync/diagnostic?accountId=${accountId}`);
      const data = await response.json();
      setDiagnostic(data);
    } catch (error) {
      console.error('Failed to run diagnostic:', error);
    } finally {
      setLoading(false);
    }
  };

  const forceRestart = async () => {
    const confirmed = await confirm({
      title: 'Force Restart Sync',
      message: 'Force restart the sync? This will continue from where it left off.',
      confirmText: 'Restart',
      cancelText: 'Cancel',
      variant: 'warning',
    });

    if (!confirmed) return;

    setRestarting(true);
    try {
      const response = await fetch('/api/nylas/sync/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, action: 'force_restart' }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Sync force restarted successfully! Refresh the page in a few seconds.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to restart: ' + data.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to force restart:', error);
      toast({
        title: 'Error',
        description: 'Failed to restart sync',
        variant: 'destructive',
      });
    } finally {
      setRestarting(false);
    }
  };

  return (
    <>
      <Dialog />
      <div className="space-y-4">
        <Button onClick={runDiagnostic} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
          Run Sync Diagnostic
        </Button>

      {diagnostic && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            {diagnostic.diagnosis.isStalled ? (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            <h3 className="font-semibold">
              {diagnostic.diagnosis.isStalled ? 'Sync Stalled' : 'Sync Status OK'}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>
              <span className="ml-2 font-medium">{diagnostic.sync.status}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Progress:</span>
              <span className="ml-2 font-medium">{diagnostic.sync.progress}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Synced:</span>
              <span className="ml-2 font-medium">{diagnostic.sync.syncedEmailCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total:</span>
              <span className="ml-2 font-medium">{diagnostic.sync.totalEmailCount || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Continuations:</span>
              <span className="ml-2 font-medium">
                {diagnostic.continuation.count} / {diagnostic.continuation.maxAllowed}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Minutes Since Last Sync:</span>
              <span className="ml-2 font-medium">{diagnostic.sync.minutesSinceLastSync || 'N/A'}</span>
            </div>
          </div>

          {diagnostic.diagnosis.isStalled && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-yellow-600">{diagnostic.diagnosis.reason}</p>
              <Button onClick={forceRestart} disabled={restarting} variant="destructive">
                {restarting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Force Restart Sync
              </Button>
            </div>
          )}

          {diagnostic.errors.lastError && (
            <div className="mt-4">
              <ErrorResolutionCard
                errorMessage={diagnostic.errors.lastError}
                accountId={accountId}
                onRetry={forceRestart}
              />
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}

