'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Mail, PenTool, Sliders, Bell, Shield, Plug, Sparkles, HelpCircle, RefreshCw, Database, CheckCircle, Clock, AlertCircle, Wrench, Beaker, Search, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { SignatureEditorModal } from '@/components/signatures/SignatureEditorModal';
import { useConfirm } from '@/components/ui/confirm-dialog';
import ThemeSelector from '@/components/theme/ThemeSelector';
import { UtilitiesContent } from '@/components/settings/UtilitiesContent';
import { FeatureFlagsContent } from '@/components/settings/FeatureFlagsContent';
import { WritingStyleSettings } from '@/components/settings/WritingStyleSettings';
import CalcomSettings from '@/components/settings/CalcomSettings';
import { useToast } from '@/components/ui/use-toast';

type SettingsSection = 'sync' | 'signatures' | 'preferences' | 'notifications' | 'privacy' | 'integrations' | 'calcom' | 'ai-writing' | 'utilities' | 'features' | 'help';

export default function SettingsContent() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SettingsSection>('sync');
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    { id: 'sync' as const, name: 'Sync Status', icon: RefreshCw, keywords: ['email', 'sync', 'status', 'progress', 'accounts', 'mailbox'] },
    { id: 'signatures' as const, name: 'Signatures', icon: PenTool, keywords: ['signature', 'email', 'footer', 'sign', 'template'] },
    { id: 'preferences' as const, name: 'Preferences', icon: Sliders, keywords: ['theme', 'appearance', 'display', 'reading', 'composing', 'dark mode'] },
    { id: 'notifications' as const, name: 'Notifications', icon: Bell, keywords: ['notifications', 'alerts', 'sound', 'desktop', 'quiet hours'] },
    { id: 'privacy' as const, name: 'Privacy & Security', icon: Shield, keywords: ['privacy', 'security', 'ai', 'tracking', 'images', 'protection'] },
    { id: 'integrations' as const, name: 'Integrations', icon: Plug, keywords: ['integrations', 'zoom', 'slack', 'connect', 'third party'] },
    { id: 'calcom' as const, name: 'Cal.com Calendar', icon: Calendar, keywords: ['calendar', 'calcom', 'cal.com', 'bookings', 'appointments', 'meetings', 'schedule'] },
    { id: 'ai-writing' as const, name: 'AI & Writing Style', icon: Sparkles, keywords: ['ai', 'writing', 'style', 'tone', 'personalize', 'learn', 'compose'] },
    { id: 'utilities' as const, name: 'Utilities', icon: Wrench, keywords: ['utilities', 'tools', 'diagnostics', 'database'] },
    { id: 'features' as const, name: 'Feature Flags', icon: Beaker, keywords: ['features', 'experimental', 'beta', 'flags'] },
    { id: 'help' as const, name: 'Help & Support', icon: HelpCircle, keywords: ['help', 'support', 'guide', 'tutorial', 'shortcuts', 'onboarding'] },
  ];

  // Filter sections based on search query
  const filteredSections = sections.filter(section => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      section.name.toLowerCase().includes(query) ||
      section.keywords.some(keyword => keyword.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex flex-col md:flex-row w-full h-screen">
      {/* Mobile Header - Only visible on mobile */}
      <div className="md:hidden flex-shrink-0 border-b border-border bg-background">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-foreground">Settings</h2>
            <a
              href="/inbox"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7"/>
                <path d="M19 12H5"/>
              </svg>
              Back
            </a>
          </div>

          {/* Search Input */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Mobile Tabs - Horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {filteredSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0',
                    activeSection === section.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{section.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar - Hidden on mobile, shown as sidebar on desktop */}
      <aside className="hidden md:block md:w-64 border-r border-border bg-background p-4 overflow-y-auto flex-shrink-0">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3 text-foreground">Settings</h2>
          <a
            href="/inbox"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            Back to Inbox
          </a>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <nav className="space-y-1">
          {filteredSections.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No settings found
            </div>
          ) : (
            filteredSections.map((section) => {
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
            })
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {activeSection === 'sync' && <SyncStatusSettings />}
        {activeSection === 'signatures' && <SignaturesSettings />}
        {activeSection === 'preferences' && <PreferencesSettings />}
        {activeSection === 'notifications' && <NotificationsSettings />}
        {activeSection === 'privacy' && <PrivacySettings />}
        {activeSection === 'integrations' && <IntegrationsSettings />}
        {activeSection === 'calcom' && (
          <div className="p-4 md:p-6">
            <CalcomSettings />
          </div>
        )}
        {activeSection === 'ai-writing' && <WritingStyleSettings />}
        {activeSection === 'utilities' && <UtilitiesContent />}
        {activeSection === 'features' && <FeatureFlagsContent />}
        {activeSection === 'help' && <HelpSupportSettings />}
      </main>
    </div>
  );
}

function SyncStatusSettings() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAccounts();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      loadAccounts();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/nylas/accounts');
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadAccounts();
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'syncing':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getSyncStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Sync Complete';
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Sync Error';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  return (
    <>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold">Email Sync Status</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Monitor your email synchronization progress</p>
          </div>
          <Button onClick={handleManualRefresh} disabled={refreshing} size="sm" className="flex-shrink-0">
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        <div className="w-full space-y-6">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>Sync Overview</CardTitle>
              </div>
              <CardDescription>
                Real-time statistics about your email database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Accounts</p>
                  <p className="text-3xl font-bold">{accounts.length}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Emails Synced</p>
                  <p className="text-3xl font-bold">
                    {formatNumber(accounts.reduce((sum, acc) => sum + (acc.syncedEmailCount || 0), 0))}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Active Syncs</p>
                  <p className="text-3xl font-bold">
                    {accounts.filter(acc => acc.syncStatus === 'syncing').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Database className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="font-medium text-foreground">
                    Understanding Email Sync
                  </p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>In Database:</strong> Emails already downloaded and stored locally - these are immediately searchable and viewable.</p>
                    <p><strong>Total in Mailbox:</strong> Complete count of emails in your email provider's servers.</p>
                    <p><strong>Progress:</strong> Percentage of emails that have been downloaded from the server to your local database.</p>
                    <p><strong>Sync Speed:</strong> How many emails per minute are being processed during synchronization.</p>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2">
                    Syncs run automatically in the background. You can use the app while syncing continues.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Account Details</h2>

            {loading ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Loading sync status...
                </CardContent>
              </Card>
            ) : accounts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No email accounts connected</p>
                </CardContent>
              </Card>
            ) : (
              accounts.map((account) => {
                // If totalEmailCount is 0 (not fetched yet), use syncedEmailCount as display value
                const totalEmailsFromNylas = account.totalEmailCount || 0;
                const syncedEmails = account.syncedEmailCount || 0;

                // Display total: prefer Nylas total, fallback to synced count if total not available yet
                const totalEmails = totalEmailsFromNylas > 0 ? totalEmailsFromNylas : syncedEmails;

                const progress = account.syncProgress || 0;
                const metadata = account.metadata || {};
                const emailsPerMinute = metadata.emailsPerMinute || 0;
                const remainingEmails = Math.max(0, totalEmails - syncedEmails);
                const estimatedMinutes = emailsPerMinute > 0 && remainingEmails > 0 ? Math.ceil(remainingEmails / emailsPerMinute) : 0;

                return (
                  <Card key={account.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getSyncStatusIcon(account.syncStatus)}
                            <div>
                              <CardTitle className="text-lg">{account.emailAddress}</CardTitle>
                              <CardDescription>{getSyncStatusText(account.syncStatus)}</CardDescription>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{progress}%</div>
                          <div className="text-xs text-muted-foreground">Complete</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Sync Progress</span>
                          <span className="font-medium">{formatNumber(syncedEmails)} / {formatNumber(totalEmails)} emails</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-500",
                              account.syncStatus === 'completed' ? 'bg-green-500' :
                              account.syncStatus === 'syncing' ? 'bg-blue-500' :
                              account.syncStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">In Database</p>
                          <p className="text-lg font-semibold">{formatNumber(syncedEmails)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total in Mailbox</p>
                          <p className="text-lg font-semibold">{formatNumber(totalEmails)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                          <p className="text-lg font-semibold">{formatNumber(remainingEmails)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Sync Speed</p>
                          <p className="text-lg font-semibold">{emailsPerMinute}/min</p>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t text-sm">
                        <div>
                          <span className="text-muted-foreground">Last Synced:</span>
                          <span className="ml-2 font-medium">{formatDate(account.lastSyncedAt)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Provider:</span>
                          <span className="ml-2 font-medium capitalize">{account.provider || 'Unknown'}</span>
                        </div>
                        {account.syncStatus === 'syncing' && estimatedMinutes > 0 && (
                          <div className="md:col-span-2">
                            <span className="text-muted-foreground">Estimated time remaining:</span>
                            <span className="ml-2 font-medium">
                              {estimatedMinutes < 60 ? `~${estimatedMinutes} minutes` : `~${Math.round(estimatedMinutes / 60)} hours`}
                            </span>
                          </div>
                        )}
                        {account.lastError && (
                          <div className="md:col-span-2 text-red-600 dark:text-red-400">
                            <span className="text-muted-foreground">Error:</span>
                            <span className="ml-2">{account.lastError}</span>
                          </div>
                        )}
                      </div>

                      {/* Status Messages */}
                      {account.syncStatus === 'completed' && progress === 100 && (
                        <div className="rounded-lg border border-primary/20 bg-accent p-3">
                          <p className="text-sm text-foreground">
                            <CheckCircle className="inline h-4 w-4 mr-2 text-primary" />
                            All emails have been synced! Your mailbox is fully up to date.
                          </p>
                        </div>
                      )}
                      {account.syncStatus === 'syncing' && (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                          <p className="text-sm text-muted-foreground">
                            <RefreshCw className="inline h-4 w-4 mr-2 animate-spin text-primary" />
                            Sync in progress... You can continue using the app while emails are being downloaded.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Help Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Why is my sync slow?</strong> Sync speed depends on your email provider's rate limits. Google allows faster sync than Microsoft.</p>
              <p><strong>Will syncing affect performance?</strong> No, syncs run in the background without affecting your ability to read and send emails.</p>
              <p><strong>How often does it sync?</strong> Initial sync downloads all historical emails. After that, new emails are synced automatically in real-time.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function SignaturesSettings() {
  const { toast } = useToast();
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
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete signature',
        variant: 'destructive',
      });
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
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold">Email Signatures</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Create and manage email signatures</p>
          </div>
          <Button onClick={handleCreateNew} className="flex-shrink-0">
            <PenTool className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">New Signature</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
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
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Email Preferences</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Customize your email experience</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        <div className="w-full space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of your inbox</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">Choose between light and dark mode</p>
                </div>
                <div className="w-48">
                  <ThemeSelector />
                </div>
              </div>
            </CardContent>
          </Card>

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
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground [color-scheme:light] dark:[color-scheme:dark]">
                  <option className="bg-background text-foreground">Reply</option>
                  <option className="bg-background text-foreground">Reply All</option>
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

  const handleQuietHoursToggle = async (enabled: boolean) => {
    const { saveNotificationPreferences } = await import('@/lib/notifications/notification-service');

    const newPreferences = {
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        enabled,
      },
    };

    setPreferences(newPreferences);
    saveNotificationPreferences(newPreferences);
  };

  const handleQuietHoursTimeChange = async (field: 'start' | 'end', value: string) => {
    const { saveNotificationPreferences } = await import('@/lib/notifications/notification-service');

    const newPreferences = {
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        [field]: value,
      },
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
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Notifications</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Manage how you receive notifications</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        <div className="w-full space-y-6">
          {!permission.granted && (
            <Card className="border-primary/20 bg-primary/5">
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

          {/* Quiet Hours */}
          {permission.granted && preferences.enabled && (
            <Card>
              <CardHeader>
                <CardTitle>Quiet Hours</CardTitle>
                <CardDescription>
                  Pause notifications during specific hours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Quiet Hours</p>
                    <p className="text-sm text-muted-foreground">Mute notifications during sleep hours</p>
                  </div>
                  <Switch
                    checked={preferences.quietHours.enabled}
                    onCheckedChange={handleQuietHoursToggle}
                  />
                </div>

                {preferences.quietHours.enabled && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quiet-start">Start Time</Label>
                        <Input
                          id="quiet-start"
                          type="time"
                          value={preferences.quietHours.start}
                          onChange={(e) => handleQuietHoursTimeChange('start', e.target.value)}
                          className="[color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quiet-end">End Time</Label>
                        <Input
                          id="quiet-end"
                          type="time"
                          value={preferences.quietHours.end}
                          onChange={(e) => handleQuietHoursTimeChange('end', e.target.value)}
                          className="[color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Notifications will be paused from {preferences.quietHours.start} to {preferences.quietHours.end} every day.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Privacy & Security</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Control your privacy and security settings</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
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
                  <div className="rounded-lg border border-border bg-muted p-3">
                    <p className="text-xs text-muted-foreground">
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
                <div className="rounded-lg border border-primary/20 bg-accent p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground mb-1">
                        AI Analysis Enabled
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">
                        New attachments will be automatically classified and analyzed.
                      </p>
                      <p className="text-xs text-muted-foreground">
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
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Integrations</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Connect third-party services</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        <div className="w-full space-y-6">
          {/* Available Integration: Cal.com */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground mb-1">
                    Cal.com Integration Available
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Connect your Cal.com account to sync bookings and meetings. Go to "Cal.com Calendar" section to set it up.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coming Soon */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Coming Soon</h2>
            <div className="space-y-4">
              <Card className="opacity-60">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                        <span className="text-foreground font-bold">Z</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Zoom</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                            Coming Soon
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">Add Zoom meetings to emails</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="opacity-60">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                        <span className="text-foreground font-bold">S</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Slack</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                            Coming Soon
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">Receive email notifications in Slack</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
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
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Help & Support</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Get help and learn about EaseMail features</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
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
