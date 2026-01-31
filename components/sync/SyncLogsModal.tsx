'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncLog {
  id: string;
  syncType: string;
  status: string;
  messagesSynced: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface SyncLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountEmail: string;
}

export function SyncLogsModal({ isOpen, onClose, accountId, accountEmail }: SyncLogsModalProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (isOpen && accountId) {
      loadLogs();
    }
  }, [isOpen, accountId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sync/logs?accountId=${accountId}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs || []);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error loading sync logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'started':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleString();
  };

  const getDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return 'In progress...';

    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const durationMs = end.getTime() - start.getTime();

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Sync History</DialogTitle>
          <DialogDescription>
            Recent sync operations for {accountEmail}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            Loading sync history...
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            {summary && (
              <div className="grid grid-cols-3 gap-4 p-4 rounded-lg border border-border bg-muted/30">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Syncs</p>
                  <p className="text-2xl font-bold">{summary.total}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{summary.completed}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
                </div>
              </div>
            )}

            {/* Sync Logs List */}
            <ScrollArea className="h-[400px] pr-4">
              {logs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sync history yet</p>
                  <p className="text-sm mt-2">Sync operations will appear here once they run</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        'p-4 rounded-lg border',
                        log.status === 'failed'
                          ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20'
                          : 'border-border bg-background'
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <div>
                            <p className="font-medium text-sm capitalize">
                              {log.syncType || 'Email'} Sync
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(log.startedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {log.messagesSynced || 0} emails
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getDuration(log.startedAt, log.completedAt)}
                          </p>
                        </div>
                      </div>

                      {log.errorMessage && (
                        <div className="mt-2 p-2 rounded bg-red-100 dark:bg-red-900/20 text-sm text-red-900 dark:text-red-200">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <p>{log.errorMessage}</p>
                          </div>
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Status: {log.status}</span>
                        {log.completedAt && (
                          <span>Completed: {formatDate(log.completedAt)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" size="sm" onClick={loadLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={onClose}>Close</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
