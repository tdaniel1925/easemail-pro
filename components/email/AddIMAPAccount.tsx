'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, CheckCircle, AlertCircle } from 'lucide-react';

export function AddIMAPAccount() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Connect account
      const connectResponse = await fetch('/api/imap/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          provider: 'fastmail',
        }),
      });

      const connectData = await connectResponse.json();

      if (!connectResponse.ok) {
        throw new Error(connectData.error || 'Failed to connect account');
      }

      console.log('✅ Account connected:', connectData);

      // Start sync
      const syncResponse = await fetch('/api/imap/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: connectData.account.id,
        }),
      });

      const syncData = await syncResponse.json();

      if (!syncResponse.ok) {
        console.warn('Sync failed:', syncData);
        throw new Error(`Account connected but sync failed: ${syncData.error}`);
      }

      console.log('✅ Sync started:', syncData);

      setSuccess(true);
      setEmail('');
      setPassword('');

      // Reload page after 2 seconds to show new account
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err) {
      console.error('IMAP connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Fastmail Account (Direct IMAP)</CardTitle>
        <CardDescription>
          Connect your Fastmail account using an app-specific password. No 90-day limitation - syncs ALL emails.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Account connected successfully! Starting initial sync. This may take a few minutes for large mailboxes.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Fastmail Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@fastmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">App-Specific Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter app-specific password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-gray-500">
                Generate an app-specific password in your Fastmail settings: Settings → Password & Security → App Passwords
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Fastmail Account'
              )}
            </Button>

            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Why Direct IMAP?</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>No 90-day email limitation</li>
                <li>Syncs ALL emails from ALL folders</li>
                <li>No third-party dependencies</li>
                <li>Complete mailbox access</li>
              </ul>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
