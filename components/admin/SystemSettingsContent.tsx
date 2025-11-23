'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, CheckCircle, Ban, X, Settings2, Globe, Shield, Zap, Database, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/ui/confirm-dialog';

type Tab = 'general' | 'auth' | 'features' | 'limits' | 'maintenance';

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

export default function SystemSettingsContent() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
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
  const [cleaningTags, setCleaningTags] = useState(false);
  const [cleaningEmails, setCleaningEmails] = useState(false);
  const { confirm, Dialog } = useConfirm();

  const sections = [
    { id: 'general' as Tab, name: 'General', icon: Globe },
    { id: 'auth' as Tab, name: 'Authentication', icon: Shield },
    { id: 'features' as Tab, name: 'Features', icon: Zap },
    { id: 'limits' as Tab, name: 'Limits & Quotas', icon: Database },
    { id: 'maintenance' as Tab, name: 'Maintenance', icon: Trash2 },
  ];

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

  const handleCleanupTags = async () => {
    const confirmed = await confirm({
      title: 'Clean Up Default Tags',
      message: 'Are you sure you want to remove default tags from all contacts? This action cannot be undone.',
      confirmText: 'Clean Up',
      cancelText: 'Cancel',
      variant: 'warning',
    });

    if (!confirmed) {
      return;
    }

    setCleaningTags(true);
    try {
      const response = await fetch('/api/admin/cleanup/tags', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        showToast('success',
          `Cleanup complete! Updated ${data.contactsUpdated} contacts, removed ${data.tagsRemoved} tags.`
        );
      } else {
        showToast('error', data.error || 'Tag cleanup failed');
      }
    } catch (error) {
      console.error('Tag cleanup failed:', error);
      showToast('error', 'Tag cleanup failed');
    } finally {
      setCleaningTags(false);
    }
  };

  const handleCleanupEmails = async () => {
    const confirmed = await confirm({
      title: 'Clean Up Placeholder Emails',
      message: 'Are you sure you want to remove placeholder emails from all contacts? Contacts without phone numbers will be deleted. This action cannot be undone.',
      confirmText: 'Clean Up',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setCleaningEmails(true);
    try {
      const response = await fetch('/api/admin/cleanup/emails', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        showToast('success',
          `Cleanup complete! Updated ${data.emailsRemoved} contacts, deleted ${data.contactsDeleted} contacts without phone numbers.`
        );
      } else {
        showToast('error', data.error || 'Email cleanup failed');
      }
    } catch (error) {
      console.error('Email cleanup failed:', error);
      showToast('error', 'Email cleanup failed');
    } finally {
      setCleaningEmails(false);
    }
  };

  return (
    <>
      <Dialog />
      <div className="flex w-full h-screen">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-background p-4 overflow-y-auto flex-shrink-0">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3 text-foreground">System Settings</h2>
          <a 
            href="/admin"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            Back to Admin
          </a>
        </div>
        <nav className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeTab === section.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{section.name}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {sections.find(s => s.id === activeTab)?.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configure system-wide {activeTab} settings
              </p>
            </div>
            <Button onClick={handleSaveSettings} disabled={saving || loading}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className="mx-6 mt-4">
            <div className={`p-4 rounded-lg border flex items-start gap-3 animate-in slide-in-from-top-2 ${
              toast.type === 'success' ? 'bg-primary/10 border-primary text-primary' :
              'bg-destructive/10 border-destructive text-destructive'
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
          </div>
        )}

        {/* Content Area */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="max-w-4xl space-y-6">
              {activeTab === 'general' && (
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
              )}

              {activeTab === 'auth' && (
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
              )}

              {activeTab === 'features' && (
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
              )}

              {activeTab === 'limits' && (
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
              )}

              {activeTab === 'maintenance' && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Cleanup</CardTitle>
                      <CardDescription>
                        Remove unwanted or placeholder data from contacts
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Clean Up Default Tags */}
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-medium text-sm mb-1">Clean Up Default Tags</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Removes default/unwanted tags like "Contacts", "My Contacts", "Starred", etc. from all contacts.
                          </p>
                        </div>
                        <Button
                          onClick={handleCleanupTags}
                          disabled={cleaningTags || cleaningEmails}
                          variant="outline"
                          className="w-full sm:w-auto"
                        >
                          {cleaningTags ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Cleaning Tags...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Clean Up Tags
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="border-t border-border pt-6">
                        {/* Clean Up Placeholder Emails */}
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-medium text-sm mb-1">Clean Up Placeholder Emails</h3>
                            <p className="text-sm text-muted-foreground mb-3">
                              Removes placeholder emails (noemail@, test@, temp@, etc.). Contacts with phone numbers will be kept, others will be deleted.
                            </p>
                          </div>
                          <Button
                            onClick={handleCleanupEmails}
                            disabled={cleaningTags || cleaningEmails}
                            variant="outline"
                            className="w-full sm:w-auto"
                          >
                            {cleaningEmails ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Cleaning Emails...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Clean Up Emails
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border bg-muted">
                    <CardHeader>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <Ban className="h-5 w-5 text-primary" />
                        Warning
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        These cleanup operations are permanent and cannot be undone. Always ensure you have a backup before performing maintenance operations.
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
    </>
  );
}

