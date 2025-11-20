'use client';

import { Loader2, Sparkles, Mail, Brain, StopCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface SyncingIndicatorProps {
  accountId?: string;
  emailCount?: number; // Pass current email count
}

export default function SyncingIndicator({ accountId, emailCount = 0 }: SyncingIndicatorProps) {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin (only admins can see sync dashboard)
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/user/role');
        const data = await response.json();
        setIsAdmin(data.role === 'platform_admin' || data.role === 'org_admin');
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (!accountId || !isAdmin) {
      setLoading(false);
      return;
    }

    const checkSync = async () => {
      try {
        const response = await fetch(`/api/nylas/sync/background?accountId=${accountId}`);
        const data = await response.json();
        
        if (data.success && (data.syncStatus === 'syncing' || data.syncStatus === 'background_syncing')) {
          setSyncStatus(data);
          setStopped(false); // Reset stopped state if sync resumes
        } else {
          setSyncStatus(null);
        }
      } catch (error) {
        console.error('Failed to check sync status:', error);
        setSyncStatus(null);
      } finally {
        setLoading(false);
      }
    };

    checkSync();
    
    // Poll every 3 seconds while syncing
    const interval = setInterval(checkSync, 3000);
    
    return () => clearInterval(interval);
  }, [accountId]);

  const handleStopSync = async () => {
    if (!accountId) return;
    
    setStopping(true);
    try {
      const response = await fetch('/api/nylas/sync/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      const data = await response.json();

      if (data.success) {
        setSyncStatus(null);
        setStopped(true); // Show stopped confirmation
      }
    } catch (error) {
      console.error('Stop sync failed:', error);
    } finally {
      setStopping(false);
    }
  };

  const handleRestartSync = async () => {
    if (!accountId) return;
    
    setRestarting(true);
    try {
      // Trigger sync restart
      const response = await fetch('/api/nylas/sync/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      const data = await response.json();

      if (data.success) {
        setStopped(false); // Hide confirmation
        // The sync status will be picked up by the polling useEffect
      }
    } catch (error) {
      console.error('Restart sync failed:', error);
    } finally {
      setRestarting(false);
    }
  };

  // Show stopped confirmation
  if (stopped) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-6">
        <div className="relative">
          <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl">
            <StopCircle className="w-16 h-16 text-white" />
          </div>
        </div>

        <div className="text-center space-y-4 max-w-md">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Sync Stopped
          </h3>
          
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <p className="text-sm text-orange-800 dark:text-orange-300">
              ✅ Email sync has been stopped successfully. You can restart it anytime using the button below.
            </p>
          </div>

          <Button
            onClick={handleRestartSync}
            disabled={restarting}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            {restarting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Restarting Sync...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Restart Sync
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground mt-2">
            Or go to <a href="/accounts" className="text-primary hover:underline">Email Accounts</a> to manage sync settings
          </p>
        </div>
      </div>
    );
  }

  // Don't show if there are already emails OR if not syncing
  if (loading || !syncStatus || emailCount > 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-8">
      {/* Animated Syncing Icon */}
      <div className="relative">
        {/* Outer pulsing ring */}
        <div className="absolute inset-0 w-32 h-32 rounded-full bg-blue-500/20 animate-ping"></div>
        <div className="absolute inset-0 w-32 h-32 rounded-full bg-blue-500/30 animate-pulse"></div>
        
        {/* Main icon circle */}
        <div className="relative w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl">
          <Loader2 className="w-16 h-16 text-white animate-spin" />
        </div>
      </div>

      {/* Progress Text */}
      <div className="text-center space-y-4 max-w-md">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Syncing Your Emails
        </h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span className="text-sm">
              {syncStatus.syncedEmailCount?.toLocaleString() || 0} emails synced
              {syncStatus.totalEmailCount && ` of ~${syncStatus.totalEmailCount.toLocaleString()}`}
            </span>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Brain className="w-4 h-4" />
            <span className="text-sm">AI analyzing emails for smart features</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="text-sm">Training your personalized writing model</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden mt-6">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${syncStatus.progress || 0}%` }}
          >
            <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
          </div>
        </div>
        
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          {syncStatus.progress || 0}% Complete
        </p>

        {/* Stop Sync Button */}
        <div className="pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStopSync}
            disabled={stopping}
            className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950 dark:border-orange-700"
          >
            <StopCircle className="h-4 w-4 mr-2" />
            {stopping ? 'Stopping...' : 'Stop Sync'}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground italic mt-4">
          Please be patient. Emails will start appearing as they sync.
        </p>
      </div>
    </div>
  );
}


