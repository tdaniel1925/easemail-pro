'use client';

import { useState, useEffect } from 'react';
import { Calendar, Check, RefreshCw, X, ExternalLink, Webhook, Key, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CalcomConnection {
  id: string;
  label: string;
  isActive: boolean;
  lastSynced: string | null;
  createdAt: string;
}

interface CalcomBooking {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  attendees: any[];
  location?: string;
  meeting_url?: string;
}

export default function CalcomSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connection, setConnection] = useState<CalcomConnection | null>(null);
  const [bookings, setBookings] = useState<CalcomBooking[]>([]);

  // Connection form
  const [apiKey, setApiKey] = useState('');
  const [label, setLabel] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Webhook URL for user to copy
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/calcom/webhook`
    : '';

  useEffect(() => {
    fetchConnectionStatus();
  }, []);

  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch('/api/calcom/connection');
      const data = await response.json();

      if (data.connected) {
        setConnected(true);
        setConnection(data.connection);
        // Fetch bookings from database
        fetchBookings();
      }
    } catch (error) {
      console.error('Failed to fetch Cal.com connection:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/calcom/bookings?fromDb=true&status=ACCEPTED,PENDING');
      const data = await response.json();

      if (data.success) {
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your Cal.com API key',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/calcom/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          label: label.trim() || 'My Cal.com Account',
          webhookSecret: webhookSecret.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Connected Successfully',
          description: data.message,
        });

        setConnected(true);
        setConnection(data.connection);
        setApiKey('');
        setLabel('');
        // Keep webhook secret for display

        // Fetch bookings
        await syncBookings();
      } else {
        toast({
          title: 'Connection Failed',
          description: data.error || data.details,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect Cal.com account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Cal.com? This will remove all synced bookings.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/calcom/connection', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Disconnected',
          description: 'Cal.com account disconnected successfully',
        });

        setConnected(false);
        setConnection(null);
        setBookings([]);
        setWebhookSecret('');
      } else {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect Cal.com',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const syncBookings = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/calcom/bookings');
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sync Complete',
          description: `Synced ${data.count} booking(s) from Cal.com`,
        });

        setBookings(data.bookings || []);

        // Update connection last synced
        if (connection) {
          setConnection({
            ...connection,
            lastSynced: data.lastSynced,
          });
        }
      } else {
        toast({
          title: 'Sync Failed',
          description: data.error || data.details,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sync bookings',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Cal.com branding */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Calendar className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Cal.com Integration</h3>
          <p className="text-sm text-muted-foreground">
            Sync your Cal.com bookings and events
          </p>
        </div>
      </div>

      {!connected ? (
        /* Connection Setup */
        <Card>
          <CardHeader>
            <CardTitle>Connect Cal.com Account</CardTitle>
            <CardDescription>
              Enter your Cal.com API credentials to sync your calendar bookings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* API Key Input */}
            <div className="space-y-2">
              <Label htmlFor="calcom-api-key">
                API Key <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="calcom-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="cal_live_..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a
                  href="https://app.cal.com/settings/developer/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Cal.com Settings → Security → API Keys
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            {/* Label Input */}
            <div className="space-y-2">
              <Label htmlFor="calcom-label">Account Label (Optional)</Label>
              <Input
                id="calcom-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="My Cal.com Account"
              />
            </div>

            {/* Webhook Secret Input */}
            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Webhook Secret (Optional but Recommended)</Label>
              <Input
                id="webhook-secret"
                type={showApiKey ? 'text' : 'password'}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Enter a secure secret key"
              />
              <p className="text-xs text-muted-foreground">
                Used to verify webhook authenticity. Set this same secret when configuring webhooks in Cal.com.
              </p>
            </div>

            <Button onClick={handleConnect} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Connect Cal.com
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Connected State */
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    Connected to Cal.com
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {connection?.label}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={loading}>
                  <X className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Synced:</span>
                <span className="font-medium">
                  {connection?.lastSynced ? formatDate(connection.lastSynced) : 'Never'}
                </span>
              </div>
              <Button onClick={syncBookings} disabled={syncing} variant="outline" className="w-full">
                {syncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Bookings Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Webhook Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Setup
              </CardTitle>
              <CardDescription>
                Get real-time updates when bookings are created, cancelled, or modified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  To receive real-time booking updates, configure this webhook URL in your Cal.com settings.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      toast({ title: 'Copied!', description: 'Webhook URL copied to clipboard' });
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              {webhookSecret && (
                <div className="space-y-2">
                  <Label>Webhook Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      value={webhookSecret}
                      readOnly
                      type={showApiKey ? 'text' : 'password'}
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Go to Cal.com Settings → Developer → Webhooks</li>
                  <li>Click "New Webhook"</li>
                  <li>Paste the webhook URL above</li>
                  <li>Select events: BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED</li>
                  <li>Enter the webhook secret (if you set one)</li>
                  <li>Save the webhook</li>
                </ol>
                <a
                  href="https://app.cal.com/settings/developer/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 mt-2"
                >
                  Open Cal.com Webhook Settings
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Synced Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>
                {bookings.length} booking(s) synced from Cal.com
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No bookings found. Click "Sync Bookings Now" to fetch your latest bookings.
                </p>
              ) : (
                <div className="space-y-3">
                  {bookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{booking.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(booking.start_time)}
                        </p>
                        {booking.attendees.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            With: {booking.attendees.map((a: any) => a.name || a.email).join(', ')}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          booking.status === 'ACCEPTED'
                            ? 'bg-green-500/10 text-green-500'
                            : booking.status === 'PENDING'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : 'bg-gray-500/10 text-gray-500'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
