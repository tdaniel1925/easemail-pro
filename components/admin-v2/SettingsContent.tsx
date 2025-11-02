'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, Settings2 } from 'lucide-react';
import InlineMessage from '@/components/ui/inline-message';

interface SystemSettings {
  siteName: string;
  siteUrl: string;
  supportEmail: string;
  allowSignups: boolean;
  requireEmailVerification: boolean;
  enableSMS: boolean;
  enableAI: boolean;
  maxAttachmentSize: number;
  sessionTimeout: number;
}

export default function SettingsContent() {
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: 'EaseMail',
    siteUrl: 'http://localhost:3001',
    supportEmail: 'support@easemail.com',
    allowSignups: true,
    requireEmailVerification: false,
    enableSMS: false,
    enableAI: true,
    maxAttachmentSize: 25,
    sessionTimeout: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      showMessage('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'Settings saved successfully');
      } else {
        showMessage('error', data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      showMessage('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure global system settings and preferences
            </p>
          </div>
          <Button onClick={handleSaveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Inline Message */}
        {message && (
          <div className="mb-6">
            <InlineMessage type={message.type} message={message.text} />
          </div>
        )}

        {/* General Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Basic application configuration and branding
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading settings...</div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    placeholder="EaseMail"
                  />
                  <p className="text-xs text-muted-foreground">
                    The name of your application (shown in emails and headers)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siteUrl">Site URL</Label>
                  <Input
                    id="siteUrl"
                    value={settings.siteUrl}
                    onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
                    placeholder="https://app.easemail.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    The public URL where your application is hosted
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                    placeholder="support@easemail.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email address for user support inquiries
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Management Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Control user registration and authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allowSignups">Allow Public Signups</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow new users to register accounts
                  </p>
                </div>
                <Switch
                  id="allowSignups"
                  checked={settings.allowSignups}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allowSignups: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requireEmailVerification">Require Email Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Users must verify their email address before accessing the app
                  </p>
                </div>
                <Switch
                  id="requireEmailVerification"
                  checked={settings.requireEmailVerification}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, requireEmailVerification: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) =>
                    setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 30 })
                  }
                  min="5"
                  max="1440"
                />
                <p className="text-xs text-muted-foreground">
                  How long users stay logged in (5-1440 minutes)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Feature Toggles</CardTitle>
            <CardDescription>
              Enable or disable specific platform features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableSMS">Enable SMS Features</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to send SMS messages via Twilio
                  </p>
                </div>
                <Switch
                  id="enableSMS"
                  checked={settings.enableSMS}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableSMS: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableAI">Enable AI Features</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow AI-powered email composition, summaries, and analysis
                  </p>
                </div>
                <Switch
                  id="enableAI"
                  checked={settings.enableAI}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableAI: checked })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage & Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Storage & Limits</CardTitle>
            <CardDescription>
              Configure storage and file upload limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="maxAttachmentSize">Maximum Attachment Size (MB)</Label>
              <Input
                id="maxAttachmentSize"
                type="number"
                value={settings.maxAttachmentSize}
                onChange={(e) =>
                  setSettings({ ...settings, maxAttachmentSize: parseInt(e.target.value) || 25 })
                }
                min="1"
                max="100"
              />
              <p className="text-xs text-muted-foreground">
                Maximum file size for email attachments (1-100 MB)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

