'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Mail, PenTool, Sliders, Bell, Shield, Plug, User, Sparkles, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { SignatureEditorModal } from '@/components/signatures/SignatureEditorModal';
import { useConfirm } from '@/components/ui/confirm-dialog';

type SettingsSection = 'general' | 'signatures' | 'preferences' | 'notifications' | 'privacy' | 'integrations' | 'help';

export default function SettingsContent() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  const sections = [
    { id: 'general' as const, name: 'General', icon: User },
    { id: 'signatures' as const, name: 'Signatures', icon: PenTool },
    { id: 'preferences' as const, name: 'Preferences', icon: Sliders },
    { id: 'notifications' as const, name: 'Notifications', icon: Bell },
    { id: 'privacy' as const, name: 'Privacy & Security', icon: Shield },
    { id: 'integrations' as const, name: 'Integrations', icon: Plug },
    { id: 'help' as const, name: 'Help & Support', icon: HelpCircle },
  ];

  return (
    <div className="flex w-full h-full">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-4 overflow-y-auto flex-shrink-0">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3 text-foreground">Settings</h2>
          <a 
            href="/inbox"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            Back to Inbox
          </a>
        </div>
        <nav className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeSection === section.id
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
        {activeSection === 'general' && <GeneralSettings />}
        {activeSection === 'signatures' && <SignaturesSettings />}
        {activeSection === 'preferences' && <PreferencesSettings />}
        {activeSection === 'notifications' && <NotificationsSettings />}
        {activeSection === 'privacy' && <PrivacySettings />}
        {activeSection === 'integrations' && <IntegrationsSettings />}
        {activeSection === 'help' && <HelpSupportSettings />}
      </main>
    </div>
  );
}

function GeneralSettings() {
  return (
    <>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">General Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your account information and preferences</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="w-full space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="john@example.com" disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Language & Region</CardTitle>
              <CardDescription>Set your language and regional preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background">
                    <option>English (US)</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background">
                    <option>Pacific Time (PT)</option>
                    <option>Mountain Time (MT)</option>
                    <option>Central Time (CT)</option>
                    <option>Eastern Time (ET)</option>
                  </select>
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function SignaturesSettings() {
  const [signatures, setSignatures] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSignature, setEditingSignature] = useState<any>(null);
  
  // Confirmation dialog
  const { confirm, Dialog: ConfirmDialog } = useConfirm();

  useEffect(() => {
    loadSignatures();
    loadAccounts();
  }, []);

  const loadSignatures = async () => {
    try {
      const response = await fetch('/api/signatures');
      const data = await response.json();
      setSignatures(data.signatures || []);
    } catch (error) {
      console.error('Error loading signatures:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/nylas/accounts');
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleCreateNew = () => {
    setEditingSignature(null);
    setEditorOpen(true);
  };

  const handleEdit = (signature: any) => {
    setEditingSignature(signature);
    setEditorOpen(true);
  };

  const handleSave = async (formData: any) => {
    try {
      if (editingSignature) {
        await fetch(`/api/signatures/${editingSignature.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch('/api/signatures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      await loadSignatures();
      setEditorOpen(false);
    } catch (error) {
      console.error('Error saving signature:', error);
      throw error;
    }
  };

  const handleDelete = async (signatureId: string) => {
    const confirmed = await confirm({
      title: 'Delete Signature',
      message: 'Are you sure you want to delete this signature?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await fetch(`/api/signatures/${signatureId}`, {
        method: 'DELETE',
      });
      await loadSignatures();
    } catch (error) {
      console.error('Error deleting signature:', error);
      alert('Failed to delete signature');
    }
  };

  const handleToggleActive = async (signature: any) => {
    try {
      await fetch(`/api/signatures/${signature.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !signature.isActive,
        }),
      });
      await loadSignatures();
    } catch (error) {
      console.error('Error toggling signature:', error);
    }
  };

  return (
    <>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Email Signatures</h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage email signatures</p>
          </div>
          <Button onClick={handleCreateNew}>
            <PenTool className="h-4 w-4 mr-2" />
            New Signature
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="w-full space-y-6">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading signatures...
              </CardContent>
            </Card>
          ) : signatures.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <PenTool className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No signatures yet</p>
                <Button onClick={handleCreateNew}>Create Your First Signature</Button>
              </CardContent>
            </Card>
          ) : (
            signatures.map((signature) => (
              <Card key={signature.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{signature.name}</CardTitle>
                      <CardDescription>
                        {signature.isDefault && <span className="text-primary font-medium">Default • </span>}
                        {signature.accountId
                          ? `For ${signature.account?.emailAddress || 'specific account'}`
                          : 'All Accounts'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {signature.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <Switch
                        checked={signature.isActive}
                        onCheckedChange={() => handleToggleActive(signature)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border border-border rounded-lg p-4 bg-muted/50">
                    <div dangerouslySetInnerHTML={{ __html: signature.contentHtml }} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleEdit(signature)}>Edit</Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(signature.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {editorOpen && (
        <SignatureEditorModal
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          onSave={handleSave}
          signature={editingSignature}
          accounts={accounts}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog />
    </>
  );
}

function PreferencesSettings() {
  return (
    <>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Email Preferences</h1>
            <p className="text-sm text-muted-foreground mt-1">Customize your email experience</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="w-full space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reading & Display</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Conversation View</p>
                  <p className="text-sm text-muted-foreground">Group related emails together</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-advance</p>
                  <p className="text-sm text-muted-foreground">Move to next email after delete or archive</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show Images</p>
                  <p className="text-sm text-muted-foreground">Always display external images</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Composing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Reply Behavior</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option>Reply</option>
                  <option>Reply All</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Smart Compose</p>
                  <p className="text-sm text-muted-foreground">AI-powered writing suggestions</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function NotificationsSettings() {
  const [preferences, setPreferences] = useState({
    enabled: false,
    sound: false,
    showPreview: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  });
  const [permission, setPermission] = useState({ granted: false, denied: false, default: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const { getNotificationPreferences, getNotificationPermission } = await import('@/lib/notifications/notification-service');
        
        const prefs = getNotificationPreferences();
        setPreferences({
          ...prefs,
          quietHours: prefs.quietHours || {
            enabled: false,
            start: '22:00',
            end: '08:00',
          },
        });
        
        const perm = getNotificationPermission();
        setPermission(perm);
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const handleRequestPermission = async () => {
    const { requestNotificationPermission } = await import('@/lib/notifications/notification-service');
    const result = await requestNotificationPermission();
    setPermission(result);
    
    if (result.granted) {
      handleToggle('enabled', true);
    }
  };

  const handleToggle = async (key: string, value: boolean) => {
    const { saveNotificationPreferences } = await import('@/lib/notifications/notification-service');
    
    const newPreferences = {
      ...preferences,
      [key]: value,
    };
    
    setPreferences(newPreferences);
    saveNotificationPreferences(newPreferences);
  };

  const handleTestNotification = async () => {
    const { testNotification } = await import('@/lib/notifications/notification-service');
    await testNotification();
  };

  if (loading) {
    return (
      <>
        <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        <div className="p-6">
          <div className="max-w-4xl">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage how you receive notifications</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="w-full space-y-6">
          {!permission.granted && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle>Enable Notifications</CardTitle>
                <CardDescription>
                  Allow EaseMail to show desktop notifications for new emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleRequestPermission}>
                  Enable Desktop Notifications
                </Button>
                {permission.denied && (
                  <p className="text-sm text-destructive mt-2">
                    Notifications are blocked. Please enable them in your browser settings.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Desktop Notifications</p>
                  <p className="text-sm text-muted-foreground">Show notifications on your desktop</p>
                </div>
                <Switch
                  checked={preferences.enabled && permission.granted}
                  onCheckedChange={(checked) => handleToggle('enabled', checked)}
                  disabled={!permission.granted}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sound</p>
                  <p className="text-sm text-muted-foreground">Play sound for new emails</p>
                </div>
                <Switch
                  checked={preferences.sound && preferences.enabled}
                  onCheckedChange={(checked) => handleToggle('sound', checked)}
                  disabled={!permission.granted || !preferences.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show Preview</p>
                  <p className="text-sm text-muted-foreground">Display email content in notifications</p>
                </div>
                <Switch
                  checked={preferences.showPreview && preferences.enabled}
                  onCheckedChange={(checked) => handleToggle('showPreview', checked)}
                  disabled={!permission.granted || !preferences.enabled}
                />
              </div>

              {permission.granted && preferences.enabled && (
                <div className="pt-4 border-t">
                  <Button variant="outline" onClick={handleTestNotification}>
                    Test Notification
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function PrivacySettings() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/user/preferences')
      .then(res => res.json())
      .then(data => {
        setAiEnabled(data.aiAttachmentProcessing || false);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load preferences:', err);
        setLoading(false);
      });
  }, []);

  const handleAiToggle = async (enabled: boolean) => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiAttachmentProcessing: enabled }),
      });

      if (response.ok) {
        setAiEnabled(enabled);
      } else {
        console.error('Failed to update preference');
      }
    } catch (error) {
      console.error('Error updating preference:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Privacy & Security</h1>
            <p className="text-sm text-muted-foreground mt-1">Control your privacy and security settings</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="w-full space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>AI Features</CardTitle>
              </div>
              <CardDescription>
                Control how artificial intelligence is used to enhance your email experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">AI Attachment Analysis</p>
                    {saving && <span className="text-xs text-muted-foreground">(saving...)</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Automatically classify attachments as invoices, receipts, contracts, and more. 
                    Extract key data like amounts, dates, and vendors using OpenAI's API.
                  </p>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3">
                    <p className="text-xs text-amber-900 dark:text-amber-200">
                      <strong>Privacy Notice:</strong> When enabled, attachment files are sent to OpenAI for processing. 
                      Files are analyzed and deleted after 30 days per OpenAI's data retention policy. 
                      Your files are never used for AI training.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={aiEnabled}
                  onCheckedChange={handleAiToggle}
                  disabled={loading || saving}
                />
              </div>

              {aiEnabled && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100 mb-1">
                        AI Analysis Enabled
                      </p>
                      <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                        New attachments will be automatically classified and analyzed.
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Cost: ~$0.003 per attachment • Powered by OpenAI GPT-4
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Tracking Protection</p>
                  <p className="text-sm text-muted-foreground">Block email tracking pixels</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Block External Images</p>
                  <p className="text-sm text-muted-foreground">Prevent automatic image loading</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function IntegrationsSettings() {
  return (
    <>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Integrations</h1>
            <p className="text-sm text-muted-foreground mt-1">Connect third-party services</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-4xl space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                    <span className="text-white font-bold">Z</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Zoom</h3>
                    <p className="text-sm text-muted-foreground">Add Zoom meetings to emails</p>
                  </div>
                </div>
                <Button variant="outline">Connect</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                    <span className="text-white font-bold">S</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Slack</h3>
                    <p className="text-sm text-muted-foreground">Receive email notifications in Slack</p>
                  </div>
                </div>
                <Button variant="outline">Connect</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function HelpSupportSettings() {
  const router = useRouter();
  
  const restartOnboarding = async () => {
    await fetch('/api/user/onboarding/reset', { method: 'POST' });
    router.push('/inbox?onboarding=restart');
  };

  return (
    <>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Help & Support</h1>
            <p className="text-sm text-muted-foreground mt-1">Get help and learn about EaseMail features</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="w-full space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Getting Started
              </CardTitle>
              <CardDescription>
                Learn the basics and explore powerful features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium">Take the Tour Again</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Replay the interactive walkthrough to review key features: 
                    connecting accounts, using AI, voice messages, SMS, and more.
                  </p>
                </div>
                <Button onClick={restartOnboarding}>
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Start Tour
                </Button>
              </div>

              <div className="flex items-start justify-between gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    <p className="font-medium">Help Center</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Browse our comprehensive help articles, guides, and tutorials
                  </p>
                </div>
                <Button variant="outline" onClick={() => router.push('/help')}>
                  Browse
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Support</CardTitle>
              <CardDescription>Get help when you need it</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4 p-4 border border-border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4" />
                    <p className="font-medium">Email Support</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    support@easemail.app • Response within 24 hours
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <a href="mailto:support@easemail.app">
                    Send Email
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Keyboard Shortcuts</CardTitle>
              <CardDescription>Work faster with shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">C</kbd>
                  <span className="ml-2 text-muted-foreground">Compose</span>
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">E</kbd>
                  <span className="ml-2 text-muted-foreground">Archive</span>
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">#</kbd>
                  <span className="ml-2 text-muted-foreground">Delete</span>
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">R</kbd>
                  <span className="ml-2 text-muted-foreground">Reply</span>
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+Enter</kbd>
                  <span className="ml-2 text-muted-foreground">Send</span>
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">?</kbd>
                  <span className="ml-2 text-muted-foreground">Show all shortcuts</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
