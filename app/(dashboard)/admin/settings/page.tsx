'use client';

import { useEffect, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, CheckCircle, Ban, X, Settings2 } from 'lucide-react';

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

export default function SystemSettingsPage() {
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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
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
      showToast('error', 'Failed to load settings');
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
      showToast('success', 'Settings saved successfully');
      } else {
      showToast('error', data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure global system settings and preferences
          </p>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className={`mb-6 p-4 rounded-lg border flex items-start gap-3 animate-in slide-in-from-top-2 ${
            toast.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-500' :
            'bg-red-500/10 border-red-500 text-red-500'
          }`}>
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <Ban className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <p className="font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic system configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  placeholder="Enter site name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteUrl">Site URL</Label>
                <Input
                  id="siteUrl"
                  type="url"
                  value={settings.siteUrl}
                  onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
                  placeholder="https://your-domain.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  placeholder="support@example.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Authentication Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Authentication & Security</CardTitle>
              <CardDescription>
                User authentication and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allowSignups">Allow Public Signups</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow new users to create accounts
                  </p>
                </div>
                <Switch
                  id="allowSignups"
                  checked={settings.allowSignups}
                  onCheckedChange={(checked) => setSettings({ ...settings, allowSignups: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requireEmailVerification">Require Email Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Users must verify their email before accessing the system
                  </p>
                </div>
                <Switch
                  id="requireEmailVerification"
                  checked={settings.requireEmailVerification}
                  onCheckedChange={(checked) => setSettings({ ...settings, requireEmailVerification: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min="5"
                  max="1440"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 30 })}
                />
                <p className="text-xs text-muted-foreground">
                  How long users can stay logged in without activity
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Feature Toggles */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Toggles</CardTitle>
              <CardDescription>
                Enable or disable system features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableSMS">Enable SMS Features</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to send and receive SMS messages
                  </p>
                </div>
                <Switch
                  id="enableSMS"
                  checked={settings.enableSMS}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableSMS: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableAI">Enable AI Features</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to use AI-powered email assistance
                  </p>
                </div>
                <Switch
                  id="enableAI"
                  checked={settings.enableAI}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableAI: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Limits & Quotas */}
          <Card>
            <CardHeader>
              <CardTitle>Limits & Quotas</CardTitle>
              <CardDescription>
                Configure system-wide limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxAttachmentSize">Max Attachment Size (MB)</Label>
                <Input
                  id="maxAttachmentSize"
                  type="number"
                  min="1"
                  max="100"
                  value={settings.maxAttachmentSize}
                  onChange={(e) => setSettings({ ...settings, maxAttachmentSize: parseInt(e.target.value) || 25 })}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum file size for email attachments
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                fetchSettings();
                showToast('success', 'Changes discarded');
              }}
            >
              Discard Changes
            </Button>
            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

