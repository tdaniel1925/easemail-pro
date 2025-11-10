'use client';

import { useState, useEffect } from 'react';
import { Eye, MousePointerClick, Mail, Clock, MapPin, Monitor, AlertCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface EmailTrackingStats {
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
  device: {
    type?: string;
    browser?: string;
    os?: string;
  } | null;
  location: {
    city?: string;
    region?: string;
    country?: string;
  } | null;
}

interface EmailTrackingDashboardProps {
  trackingId: string;
}

export function EmailTrackingDashboard({ trackingId }: EmailTrackingDashboardProps) {
  const [stats, setStats] = useState<EmailTrackingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrackingStats();
  }, [trackingId]);

  const fetchTrackingStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tracking/stats/${trackingId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch tracking stats');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>{error || 'Tracking data not found'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const engagementRate = stats.openCount > 0 ?
    Math.round((stats.clickCount / stats.openCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Email Tracking Overview</span>
            <Badge variant={stats.bounced ? "destructive" : stats.opened ? "default" : "secondary"}>
              {stats.bounced ? 'Bounced' : stats.opened ? 'Opened' : 'Sent'}
            </Badge>
          </CardTitle>
          <CardDescription>
            To: {stats.recipientEmail}
            {stats.subject && ` • ${stats.subject}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <Clock className="inline h-4 w-4 mr-1" />
            Sent {formatDistanceToNow(new Date(stats.sentAt), { addSuffix: true })}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Opens */}
        <Card className={stats.opened ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Email Opens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.openCount}</div>
            {stats.firstOpenedAt && (
              <div className="mt-2 text-xs text-muted-foreground">
                First opened {formatDistanceToNow(new Date(stats.firstOpenedAt), { addSuffix: true })}
              </div>
            )}
            {stats.lastOpenedAt && stats.openCount > 1 && (
              <div className="text-xs text-muted-foreground">
                Last opened {formatDistanceToNow(new Date(stats.lastOpenedAt), { addSuffix: true })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clicks */}
        <Card className={stats.clickCount > 0 ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" />
              Link Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.clickCount}</div>
            {stats.firstClickedAt && (
              <div className="mt-2 text-xs text-muted-foreground">
                First clicked {formatDistanceToNow(new Date(stats.firstClickedAt), { addSuffix: true })}
              </div>
            )}
            {stats.lastClickedAt && stats.clickCount > 1 && (
              <div className="text-xs text-muted-foreground">
                Last clicked {formatDistanceToNow(new Date(stats.lastClickedAt), { addSuffix: true })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Engagement Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Engagement Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{engagementRate}%</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Clicks per open
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device & Location Info */}
      {(stats.device || stats.location) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recipient Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.device && (
              <div className="flex items-start gap-2">
                <Monitor className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Device</div>
                  <div className="text-sm text-muted-foreground">
                    {stats.device.type && <span className="capitalize">{stats.device.type}</span>}
                    {stats.device.browser && <span> • {stats.device.browser}</span>}
                    {stats.device.os && <span> • {stats.device.os}</span>}
                  </div>
                </div>
              </div>
            )}

            {stats.location && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Location</div>
                  <div className="text-sm text-muted-foreground">
                    {[stats.location.city, stats.location.region, stats.location.country]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delivery Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Delivery Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Delivered</span>
            <Badge variant={stats.delivered ? "default" : "secondary"}>
              {stats.delivered ? 'Yes' : 'Pending'}
            </Badge>
          </div>
          {stats.deliveredAt && (
            <div className="text-xs text-muted-foreground">
              Delivered {formatDistanceToNow(new Date(stats.deliveredAt), { addSuffix: true })}
            </div>
          )}

          {stats.bounced && (
            <>
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="text-sm">Bounced</span>
                <Badge variant="destructive">Yes</Badge>
              </div>
              {stats.bounceReason && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Reason: {stats.bounceReason}
                </div>
              )}
              {stats.bouncedAt && (
                <div className="text-xs text-muted-foreground">
                  Bounced {formatDistanceToNow(new Date(stats.bouncedAt), { addSuffix: true })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
