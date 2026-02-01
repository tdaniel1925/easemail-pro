'use client';

import { useEffect, useState } from 'react';
import { useAccount } from '@/contexts/AccountContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  MousePointerClick,
  Mail,
  TrendingUp,
  Clock,
  Loader2,
  MapPin,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface TrackingStats {
  trackingId: string;
  recipientEmail: string;
  subject: string | null;
  sentAt: Date;
  opened: boolean;
  openCount: number;
  firstOpenedAt: Date | null;
  lastOpenedAt: Date | null;
  clickCount: number;
  firstClickedAt: Date | null;
  lastClickedAt: Date | null;
  delivered: boolean;
  deliveredAt: Date | null;
  bounced: boolean;
  bouncedAt: Date | null;
  bounceReason: string | null;
  device: string | null;
  location: string | null;
}

export default function TrackingPage() {
  const { selectedAccount } = useAccount();
  const { toast } = useToast();
  const [trackingStats, setTrackingStats] = useState<TrackingStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrackingStats = async (isRefresh = false) => {
    if (!selectedAccount) {
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // For now, we'll fetch from a list endpoint (you may need to create this)
      // Or we can fetch individual tracking IDs from sent emails
      const response = await fetch('/api/tracking/list');
      const data = await response.json();

      if (data.success) {
        setTrackingStats(data.stats || []);
      } else {
        toast({
          title: 'Failed to load tracking data',
          description: data.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching tracking stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tracking data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrackingStats();
  }, [selectedAccount]);

  const calculateOpenRate = () => {
    if (trackingStats.length === 0) return 0;
    const openedEmails = trackingStats.filter(s => s.opened).length;
    return Math.round((openedEmails / trackingStats.length) * 100);
  };

  const calculateClickRate = () => {
    if (trackingStats.length === 0) return 0;
    const clickedEmails = trackingStats.filter(s => s.clickCount > 0).length;
    return Math.round((clickedEmails / trackingStats.length) * 100);
  };

  const getTotalOpens = () => {
    return trackingStats.reduce((sum, stats) => sum + stats.openCount, 0);
  };

  const getTotalClicks = () => {
    return trackingStats.reduce((sum, stats) => sum + stats.clickCount, 0);
  };

  if (!selectedAccount) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>No Account Selected</CardTitle>
            <CardDescription>
              Please select an email account to view tracking data
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading tracking data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Email Tracking
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor opens, clicks, and engagement metrics
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchTrackingStats(true)}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tracked Emails</p>
                <p className="text-3xl font-bold mt-2">{trackingStats.length}</p>
              </div>
              <Mail className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Rate</p>
                <p className="text-3xl font-bold mt-2">{calculateOpenRate()}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {getTotalOpens()} total opens
                </p>
              </div>
              <Eye className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="text-3xl font-bold mt-2">{calculateClickRate()}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {getTotalClicks()} total clicks
                </p>
              </div>
              <MousePointerClick className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
                <p className="text-3xl font-bold mt-2">
                  {trackingStats.length > 0
                    ? Math.round(
                        (trackingStats.filter(s => s.delivered).length /
                          trackingStats.length) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email List */}
      {trackingStats.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Mail className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tracked Emails</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Emails with tracking enabled will appear here. Send an email with tracking to see analytics.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Tracked Emails</h2>
          {trackingStats.map((stats) => (
            <Card key={stats.trackingId}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Left side - Email info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1 truncate">
                      {stats.subject || '(No Subject)'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      To: {stats.recipientEmail}
                    </p>

                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {/* Opens */}
                      <div className="flex items-center gap-1.5">
                        <Eye className={`h-4 w-4 ${stats.opened ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <span className={stats.opened ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                          {stats.opened ? `Opened ${stats.openCount}x` : 'Not opened'}
                        </span>
                      </div>

                      {/* Clicks */}
                      <div className="flex items-center gap-1.5">
                        <MousePointerClick className={`h-4 w-4 ${stats.clickCount > 0 ? 'text-blue-500' : 'text-muted-foreground'}`} />
                        <span className={stats.clickCount > 0 ? 'text-blue-600 font-medium' : 'text-muted-foreground'}>
                          {stats.clickCount > 0 ? `${stats.clickCount} clicks` : 'No clicks'}
                        </span>
                      </div>

                      {/* Device */}
                      {stats.device && (
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{stats.device}</span>
                        </div>
                      )}

                      {/* Location */}
                      {stats.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{stats.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Timestamps */}
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Sent {formatDistanceToNow(new Date(stats.sentAt))} ago
                      </div>
                      {stats.firstOpenedAt && (
                        <div>
                          First opened {formatDistanceToNow(new Date(stats.firstOpenedAt))} ago
                        </div>
                      )}
                      {stats.lastOpenedAt && stats.openCount > 1 && (
                        <div>
                          Last opened {formatDistanceToNow(new Date(stats.lastOpenedAt))} ago
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side - Status badges */}
                  <div className="flex flex-col gap-2">
                    {stats.delivered && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Delivered
                      </Badge>
                    )}
                    {stats.bounced && (
                      <Badge variant="destructive">
                        Bounced
                      </Badge>
                    )}
                    {stats.opened && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Opened
                      </Badge>
                    )}
                    {stats.clickCount > 0 && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Clicked
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Bounce reason if any */}
                {stats.bounced && stats.bounceReason && (
                  <div className="mt-4 p-3 bg-destructive/10 rounded-md">
                    <p className="text-sm text-destructive font-medium">Bounce Reason:</p>
                    <p className="text-sm text-muted-foreground mt-1">{stats.bounceReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
