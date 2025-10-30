'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Star, Clock, Send, FileText, Trash2, Archive, Settings, Plus, Search, User, LogOut, Menu, ChevronRight, ChevronDown, Folder, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import EmailCompose from '@/components/email/EmailCompose';
import ProviderSelector from '@/components/email/ProviderSelector';
import InlineMessage from '@/components/ui/inline-message';
import SettingsMenu from '@/components/layout/SettingsMenu';

interface InboxLayoutProps {
  children: React.ReactNode;
}

export default function InboxLayout({ children }: InboxLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isProviderSelectorOpen, setIsProviderSelectorOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isAccountSelectorOpen, setIsAccountSelectorOpen] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    custom: false,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Check for success/error messages from OAuth callback
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success === 'account_added') {
      console.log('✅ Account added successfully! Fetching accounts and folders...');
      setMessage({ type: 'success', text: 'Email account connected successfully!' });
      // Refetch accounts and folders
      fetchAccounts();
      // Clear the query param
      router.replace('/inbox');
    }
    
    if (error) {
      console.error('❌ Error:', error);
      setMessage({ type: 'error', text: `Failed to connect account: ${error}` });
      router.replace('/inbox');
    }
  }, [searchParams]);

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/nylas/accounts');
      const data = await response.json();
      if (data.success && data.accounts.length > 0) {
        setAccounts(data.accounts);
        const firstAccount = data.accounts[0];
        setSelectedAccountId(firstAccount.id);
        console.log('📧 Account loaded:', firstAccount.emailAddress);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  // Fetch folders when account is selected OR when page gains focus (after sync)
  useEffect(() => {
    if (selectedAccountId) {
      fetchFolders(selectedAccountId);
    }
  }, [selectedAccountId]);

  // Refetch folders when window regains focus (after navigating back from accounts page)
  useEffect(() => {
    const handleFocus = () => {
      if (selectedAccountId) {
        console.log('🔄 Window focused, refetching folders...');
        fetchFolders(selectedAccountId);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedAccountId]);

  const fetchFolders = async (accountId: string) => {
    try {
      const response = await fetch(`/api/nylas/folders/sync?accountId=${accountId}`);
      const data = await response.json();
      if (data.success) {
        console.log('📁 All folders from API:', data.folders);
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Get icon for folder type
  const getFolderIcon = (folderType: string) => {
    const icons: Record<string, any> = {
      inbox: Mail,
      sent: Send,
      drafts: FileText,
      trash: Trash2,
      spam: Archive,
      archive: Archive,
      starred: Star,
      snoozed: Clock,
    };
    return icons[folderType?.toLowerCase()] || Folder;
  };

  // Organize folders into categories
  const systemFolders = folders.filter(f => ['inbox', 'sent', 'drafts', 'trash', 'starred', 'snoozed'].includes(f.folderType?.toLowerCase()));
  const customFolders = folders.filter(f => !['inbox', 'sent', 'drafts', 'trash', 'starred', 'snoozed', 'spam', 'archive'].includes(f.folderType?.toLowerCase()));

  console.log('🗂️ System folders:', systemFolders.map(f => `${f.displayName} (${f.folderType})`));
  console.log('📂 Custom folders:', customFolders.map(f => `${f.displayName} (${f.folderType})`));

  // Show top system folders + limited custom folders
  const visibleCustomFolders = customFolders.slice(0, 5);
  const hasMoreFolders = customFolders.length > 5;

  const defaultFolders = [
    { name: 'Inbox', icon: Mail, count: 24, href: '/inbox', active: true },
    { name: 'Starred', icon: Star, count: 5, href: '/inbox' },
    { name: 'Snoozed', icon: Clock, count: 0, href: '/inbox' },
    { name: 'Sent', icon: Send, count: 0, href: '/inbox' },
    { name: 'Drafts', icon: FileText, count: 3, href: '/inbox' },
    { name: 'Archive', icon: Archive, count: 0, href: '/inbox' },
    { name: 'Trash', icon: Trash2, count: 0, href: '/inbox' },
  ];

  const foldersToDisplay = folders.length > 0 ? 
    [...systemFolders, ...visibleCustomFolders] : 
    defaultFolders;

  return (
    <div className="flex h-screen w-full">
      {/* Left Sidebar - Folders (20%) */}
      <aside
        className={cn(
          'w-56 border-r border-border bg-card flex flex-col transition-all duration-300',
          !sidebarOpen && 'w-0 overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="h-14 px-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-sm"></div>
            <span className="text-lg font-bold">EaseMail</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden h-8 w-8"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Folders */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-2 mb-3">
            <Button className="w-full h-9 text-sm" onClick={() => setIsComposeOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Compose
            </Button>
          </div>
          
          <div className="space-y-0.5 px-2">
            {foldersToDisplay.map((folder: any) => {
              const Icon = folder.icon || getFolderIcon(folder.folderType);
              const displayName = folder.displayName || folder.name;
              const count = folder.unreadCount || folder.count || 0;
              const isActive = folder.active || false;
              
              return (
                <button
                  key={folder.id || folder.name}
                  onClick={() => router.push(folder.href || '/inbox')}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-accent text-muted-foreground'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{displayName}</span>
                  </div>
                  {count > 0 && (
                    <span className={cn(
                      'px-2 py-0.5 text-xs rounded-full flex-shrink-0',
                      isActive ? 'bg-primary-foreground text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Show "More folders" button if there are hidden folders */}
            {hasMoreFolders && (
              <button
                onClick={() => setExpandedSections({ ...expandedSections, custom: !expandedSections.custom })}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm hover:bg-accent text-muted-foreground transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {expandedSections.custom ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span>More folders ({customFolders.length - 5})</span>
                </div>
              </button>
            )}

            {/* Expanded custom folders */}
            {expandedSections.custom && customFolders.slice(5).map((folder: any) => {
              const Icon = getFolderIcon(folder.folderType);
              return (
                <button
                  key={folder.id}
                  onClick={() => router.push('/inbox')}
                  className="w-full flex items-center justify-between px-2.5 py-2 pl-8 rounded-md text-sm hover:bg-accent text-muted-foreground transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{folder.displayName}</span>
                  </div>
                  {folder.unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground flex-shrink-0">
                      {folder.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Contacts Link */}
          <div className="mt-4 px-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Quick Access
            </h3>
            <button
              onClick={() => router.push('/calendar')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-accent text-muted-foreground transition-colors"
            >
              <Calendar className="h-4 w-4" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => router.push('/contacts')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-accent text-muted-foreground transition-colors"
            >
              <User className="h-4 w-4" />
              <span>Contacts</span>
            </button>
            <button
              onClick={() => router.push('/accounts')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-accent text-muted-foreground transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span>Accounts</span>
            </button>
          </div>


          {/* Labels Section */}
          <div className="mt-4 px-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Labels
            </h3>
            <div className="space-y-0.5">
              <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-accent text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <span>Important</span>
              </button>
              <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-accent text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <span>Work</span>
              </button>
              <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-accent text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                <span>Personal</span>
              </button>
            </div>
          </div>

          {/* Storage */}
          <div className="mt-auto pt-6 px-3 pb-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-medium">4.2 GB / 15 GB</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[28%]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* User Menu */}
        <div className="p-2.5 border-t border-border space-y-1">
          <SettingsMenu 
            onLogout={handleLogout}
            onNavigate={(path) => router.push(path)}
          />
          
          {/* Account Selector Dropdown */}
          {accounts.length > 0 && (
            <div className="relative">
              {isAccountSelectorOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsAccountSelectorOpen(false)}
                  />
                  
                  {/* Dropdown Menu */}
                  <div className="absolute bottom-full left-0 mb-1 w-full bg-card border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    <div className="py-1">
                      {accounts.map((account: any) => (
                        <button
                          key={account.id}
                          onClick={() => {
                            setSelectedAccountId(account.id);
                            setIsAccountSelectorOpen(false);
                            fetchFolders(account.id);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                            selectedAccountId === account.id 
                              ? "bg-accent text-foreground" 
                              : "hover:bg-accent text-muted-foreground"
                          )}
                        >
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <div className="flex-1 text-left truncate">
                            <div className="font-medium truncate">{account.emailAddress}</div>
                            <div className="text-xs capitalize text-muted-foreground">
                              {account.emailProvider || account.nylasProvider}
                            </div>
                          </div>
                          {selectedAccountId === account.id && (
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Account Selector Button */}
              <button
                onClick={() => setIsAccountSelectorOpen(!isAccountSelectorOpen)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                  isAccountSelectorOpen ? "bg-accent" : "hover:bg-accent text-muted-foreground"
                )}
              >
                <Mail className="h-4 w-4" />
                <div className="flex-1 text-left truncate">
                  {accounts.find((a: any) => a.id === selectedAccountId)?.emailAddress || 'Select Account'}
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 transition-transform",
                  isAccountSelectorOpen && "rotate-90"
                )} />
              </button>
            </div>
          )}
          
          <button
            onClick={() => setIsProviderSelectorOpen(true)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Account</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-border flex items-center bg-card">
          <div className="flex items-center gap-3 px-4" style={{ width: '75%' }}>
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="h-8 w-8"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search emails..."
                  className="pl-9 w-full h-9 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Vertical divider - aligned with email list/contact panel split */}
          <div className="h-full border-r border-border"></div>

          {/* Right side - empty space for Contact/AI tabs (25%) */}
          <div className="flex items-center px-4" style={{ width: '25%' }}>
            {/* Tabs will be rendered directly by EmailClient */}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {message && (
            <div className="px-4 pt-4">
              <InlineMessage
                type={message.type}
                message={message.text}
                onClose={() => setMessage(null)}
              />
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </main>
      </div>
      
      {/* Email Compose Window */}
      <EmailCompose isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} />
      
      {/* Provider Selector Dialog */}
      <ProviderSelector isOpen={isProviderSelectorOpen} onClose={() => setIsProviderSelectorOpen(false)} />
    </div>
  );
}

