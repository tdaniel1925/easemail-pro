'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface SyncDiagnosticProps {
  accountId: string;
}

export function SyncDiagnostic({ accountId }: SyncDiagnosticProps) {
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [restarting, setRestarting] = useState(false);

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
    if (!confirm('Force restart the sync? This will continue from where it left off.')) return;
    
    setRestarting(true);
    try {
      const response = await fetch('/api/nylas/sync/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, action: 'force_restart' }),
      });
      const data = await response.json();
      if (data.success) {
        alert('Sync force restarted successfully! Refresh the page in a few seconds.');
      } else {
        alert('Failed to restart: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to force restart:', error);
      alert('Failed to restart sync');
    } finally {
      setRestarting(false);
    }
  };

  return (
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
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              <strong>Error:</strong> {diagnostic.errors.lastError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

