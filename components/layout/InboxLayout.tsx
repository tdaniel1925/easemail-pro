'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Star, Clock, Send, FileText, Trash2, Archive, Settings, Plus, Search, User, LogOut, Menu, ChevronRight, ChevronDown, Folder, Calendar, Paperclip, Zap, Shield, Users, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import EmailCompose from '@/components/email/EmailCompose';
import ProviderSelector from '@/components/email/ProviderSelector';
import InlineMessage from '@/components/ui/inline-message';
import SettingsMenu from '@/components/layout/SettingsMenu';
import EaseMailLogo from '@/components/ui/EaseMailLogo';
import { FolderSkeleton } from '@/components/ui/skeleton'; // âœ… PHASE 2: Loading states
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'; // âœ… PHASE 2: Keyboard shortcuts
import { buildFolderTree, flattenFolderTree } from '@/lib/email/folder-tree'; // âœ… PHASE 3: Folder hierarchy
import { FolderSearch } from '@/components/email/FolderSearch'; // âœ… PHASE 3: Folder search
import { useDragAndDrop } from '@/lib/hooks/useDragAndDrop'; // âœ… PHASE 3: Drag and drop
import { usePrefetch } from '@/lib/hooks/usePrefetch'; // âœ… PHASE 4: Prefetching
import { folderCache } from '@/lib/cache/folder-cache'; // âœ… PHASE 4: Folder caching
import { registerServiceWorker, setupOnlineListeners } from '@/lib/utils/service-worker'; // âœ… PHASE 4: Offline support
// AI Assistant is now integrated into ContactPanel tabs

interface InboxLayoutProps {
  children: React.ReactNode;
}

export default function InboxLayout({ children }: InboxLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState<any>(null);
  const [isProviderSelectorOpen, setIsProviderSelectorOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('user');
  const [hasOrganization, setHasOrganization] = useState(false); // NEW: Track org membership
  const [isAccountSelectorOpen, setIsAccountSelectorOpen] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [folderCounts, setFolderCounts] = useState<Record<string, { totalCount: number; unreadCount: number }>>({}); // âœ… PHASE 2: Real-time counts
  const [expandedSections, setExpandedSections] = useState({
    custom: false,
  });
  const [activeFolder, setActiveFolder] = useState<string>('inbox'); // âœ… FIX #6: Track active folder
  const [foldersLoading, setFoldersLoading] = useState(false); // âœ… PHASE 2: Loading state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set()); // âœ… PHASE 3: Track expanded folders
  const [isFolderSearchOpen, setIsFolderSearchOpen] = useState(false); // ✅ PHASE 3: Folder search
  const [recentFolders, setRecentFolders] = useState<string[]>([]); // ✅ PHASE 3: Recently used folders
  const [isOnline, setIsOnline] = useState(true); // ✅ PHASE 4: Online status
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const supabase = createClient();

  // âœ… PHASE 2: Keyboard shortcuts (g+i, g+s, g+d, c, etc)
  const { waitingForSecondKey } = useKeyboardShortcuts({
    onCompose: () => setIsComposeOpen(true),
    onSearch: () => {
      // âœ… PHASE 3: Open folder search
      setIsFolderSearchOpen(true);
    },
    enabled: !isFolderSearchOpen, // Disable when search is open
  });

  // âœ… PHASE 3: Drag and drop for moving emails
  const {
    dropTarget,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useDragAndDrop();

  // âœ… PHASE 4: Prefetching for instant navigation
  const {
    prefetchFolders,
    prefetchEmails,
    cancelPrefetch,
  } = usePrefetch({
    delay: 200, // Prefetch after 200ms hover
    enabled: true,
  });

  // Listen for compose events from email cards
  useEffect(() => {
    const handleComposeEvent = (event: any) => {
      const { type, email } = event.detail;
      setComposeData({ type, email });
      setIsComposeOpen(true);
    };

    window.addEventListener('openCompose' as any, handleComposeEvent);
    return () => window.removeEventListener('openCompose' as any, handleComposeEvent);
  }, []);

  // Check for success/error messages from OAuth callback
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const syncing = searchParams.get('syncing');
    const warnings = searchParams.get('warnings');
    
    if (success === 'account_added') {
      console.log('âœ… Account added successfully! Fetching accounts and folders...');
      
      if (warnings) {
        const failedItems = warnings.split(',');
        const warningText = failedItems.join(' and ');
        setMessage({ 
          type: 'info', 
          text: `âš ï¸ Account connected, but ${warningText} sync had issues. Background sync is running and will retry automatically.` 
        });
      } else if (syncing === 'true') {
        setMessage({ 
          type: 'info', 
          text: 'âœ… Account connected! Initial emails are loading below. Background sync is analyzing remaining emails - this may take a few minutes.' 
        });
      } else {
        setMessage({ type: 'success', text: 'Email account connected successfully!' });
      }
      // Refetch accounts and folders
      fetchAccounts();
      // Clear the query param
      router.replace('/inbox');
    }
    
    if (error) {
      console.error('âŒ Error:', error);
      setMessage({ type: 'error', text: `Failed to connect account: ${error}` });
      router.replace('/inbox');
    }
  }, [searchParams]);

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts();
    fetchUserContext(); // NEW: Fetch user role and org status
    
    // âœ… FIX: Check initial online status
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    
    // âœ… PHASE 4: Register service worker for offline support
    if (typeof window !== 'undefined') {
      registerServiceWorker()
        .then(registration => {
          if (registration) {
            console.log('âœ… Service worker registered successfully');
          }
        })
        .catch(err => {
          console.error('âŒ Service worker registration failed:', err);
          // Don't block app if SW fails
        });
    }
    
    // âœ… PHASE 4: Setup online/offline listeners
    const cleanup = setupOnlineListeners(
      () => {
        setIsOnline(true);
        setMessage({ type: 'success', text: 'Back online! Syncing...' });
        // Refresh data when back online
        if (selectedAccountId) {
          fetchFolders(selectedAccountId);
        }
      },
      () => {
        setIsOnline(false);
        setMessage({ type: 'info', text: 'Offline mode - showing cached data' });
      }
    );
    
    // âœ… LAYER 1: Frontend token refresh (every 5 minutes + on focus)
    const silentTokenRefresh = () => {
      fetch('/api/nylas/token-refresh', { method: 'POST' })
        .catch(() => {}); // Silent - no error handling needed
    };
    
    // Run immediately on mount
    silentTokenRefresh();
    
    // Run every 5 minutes (was 30 minutes)
    const tokenRefreshInterval = setInterval(() => {
      silentTokenRefresh();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      clearInterval(tokenRefreshInterval);
      cleanup();
    };
  }, []);

  // NEW: Fetch user's role and organization membership
  const fetchUserContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch(`/api/user/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role || 'individual');
        // Check if user has an organization (org_admin or org_user roles, or check for organizationId)
        setHasOrganization(data.role === 'org_admin' || data.role === 'org_user');
      }
    } catch (error) {
      console.error('Failed to fetch user context:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/nylas/accounts');
      const data = await response.json();
      if (data.success && data.accounts.length > 0) {
        setAccounts(data.accounts);
        const firstAccount = data.accounts[0];
        setSelectedAccountId(firstAccount.id);
        console.log('ðŸ“§ Account loaded:', firstAccount.emailAddress);
      } else {
        // No accounts - clear everything
        console.log('ðŸ“§ No accounts found - clearing data');
        setAccounts([]);
        setSelectedAccountId(null);
        setFolders([]);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  // âœ… FIX #3: Clear folders when account changes, then fetch new ones
  useEffect(() => {
    if (selectedAccountId) {
      console.log('ðŸ”„ Account changed, clearing folders and fetching new ones...');
      setFolders([]); // Clear old folders immediately
      fetchFolders(selectedAccountId);
    }
  }, [selectedAccountId]);

  // âœ… Refetch accounts when navigating back to inbox (e.g., from /accounts page)
  useEffect(() => {
    if (pathname === '/inbox') {
      console.log('ðŸ"„ Navigated to inbox, refetching accounts...');
      fetchAccounts();
    }
  }, [pathname]);

  // Refetch folders when window regains focus (after navigating back from accounts page)
  useEffect(() => {
    const handleFocus = () => {
      // âœ… Silently refresh tokens when user returns to app
      fetch('/api/nylas/token-refresh', { method: 'POST' })
        .catch(() => {}); // Silent
      
      // âœ… Refetch accounts list (in case user deleted/added accounts)
      console.log('ðŸ"„ Window focused, refetching accounts...');
      fetchAccounts();
      
      if (selectedAccountId) {
        console.log('ðŸ"„ Window focused, refetching folders and counts...');
        fetchFolders(selectedAccountId);
        // Counts will be fetched automatically by fetchFolders
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedAccountId]);

  // âœ… PHASE 2: Listen for email action events and refresh counts
  useEffect(() => {
    const handleEmailAction = (event: any) => {
      console.log('ðŸ“§ Email action detected, refreshing counts...');
      if (selectedAccountId) {
        fetchFolderCounts(selectedAccountId);
      }
    };

    // Listen for custom events from email actions
    window.addEventListener('emailActionComplete' as any, handleEmailAction);
    return () => window.removeEventListener('emailActionComplete' as any, handleEmailAction);
  }, [selectedAccountId]);

  const fetchFolders = async (accountId: string) => {
    setFoldersLoading(true); // âœ… PHASE 2: Show loading state
    
    try {
      // âœ… PHASE 4: Try cache first
      const cached = await folderCache.getFolders(accountId);
      
      if (cached) {
        console.log('ðŸ“¦ Using cached folders');
        setFolders(cached.folders || []);
        setFolderCounts(cached.counts);
        setFoldersLoading(false);
        
        // Still fetch in background to update cache
        // (handled by cache manager's background refresh)
        return;
      }
      
      // Cache miss - fetch from API
      const response = await fetch(`/api/nylas/folders/sync?accountId=${accountId}`);
      const data = await response.json();
      if (data.success) {
        console.log('ðŸ“ All folders from API:', data.folders);
        setFolders(data.folders || []);
        
        // âœ… PHASE 2: Fetch real-time counts immediately after folders load
        await fetchFolderCounts(accountId);
      } else {
        console.error('âŒ Failed to fetch folders:', data.error);
        setFolders([]); // Clear on error
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      setFolders([]); // Clear on error
    } finally {
      setFoldersLoading(false); // âœ… PHASE 2: Hide loading state
    }
  };

  // âœ… FIX: Move fetchFolderCounts to component level (not nested)
  const fetchFolderCounts = async (accountId: string) => {
    try {
      const response = await fetch(`/api/nylas/folders/counts?accountId=${accountId}`);
      const data = await response.json();
      
      if (data.success && data.counts) {
        // Convert array to map for easy lookup
        const countsMap: Record<string, { totalCount: number; unreadCount: number }> = {};
        data.counts.forEach((count: any) => {
          countsMap[count.folder.toLowerCase()] = {
            totalCount: count.totalCount,
            unreadCount: count.unreadCount,
          };
        });
        
        console.log('ðŸ“Š Real-time folder counts:', countsMap);
        setFolderCounts(countsMap);
        
        // âœ… PHASE 4: Update cache with fresh data
        if (folders.length > 0) {
          folderCache.setFolders(accountId, folders, countsMap);
        }
      }
    } catch (error) {
      console.error('Failed to fetch folder counts:', error);
    }
  };

  const handleLogout = async () => {
    // âœ… FIX: Clear cache on logout to prevent memory leaks
    folderCache.clearAll();
    await supabase.auth.signOut();
    router.push('/login');
  };

  // âœ… PHASE 3: Handle folder selection with recent folders tracking
  const handleFolderSelect = (folderName: string) => {
    setActiveFolder(folderName);
    router.push(`/inbox?folder=${encodeURIComponent(folderName)}`);
    
    // Add to recent folders (max 5)
    setRecentFolders(prev => {
      const updated = [folderName, ...prev.filter(f => f !== folderName)];
      return updated.slice(0, 5);
    });
  };

  // âœ… PHASE 3: Toggle folder expansion
  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
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

  console.log('ðŸ—‚ï¸ System folders:', systemFolders.map(f => `${f.displayName} (${f.folderType})`));
  console.log('ðŸ“‚ Custom folders:', customFolders.map(f => `${f.displayName} (${f.folderType})`));

  // âœ… PHASE 3: Build folder tree for hierarchical display
  const folderTree = buildFolderTree(customFolders);
  const flatFolders = flattenFolderTree(folderTree);

  // Show top system folders + limited custom folders
  const visibleCustomFolders = customFolders.slice(0, 5);
  const hasMoreFolders = customFolders.length > 5;

  // âœ… FIX #2: Use lowercase folder names to match database values
  const defaultFolders = [
    { name: 'inbox', icon: Mail, count: 0, href: '/inbox', active: true, displayName: 'Inbox' },
    { name: 'starred', icon: Star, count: 0, href: '/inbox', displayName: 'Starred' },
    { name: 'snoozed', icon: Clock, count: 0, href: '/inbox', displayName: 'Snoozed' },
    { name: 'sent', icon: Send, count: 0, href: '/inbox', displayName: 'Sent' },
    { name: 'drafts', icon: FileText, count: 0, href: '/inbox', displayName: 'Drafts' },
    { name: 'archive', icon: Archive, count: 0, href: '/inbox', displayName: 'Archive' },
    { name: 'trash', icon: Trash2, count: 0, href: '/inbox', displayName: 'Trash' },
  ];

  // Only show folders if we have accounts, otherwise show empty state
  const foldersToDisplay = accounts.length > 0 
    ? (folders.length > 0 ? [...systemFolders, ...visibleCustomFolders] : defaultFolders)
    : [];

  return (
    <div className="flex h-screen w-full">
      {/* Left Sidebar - Folders (20%) */}
      <aside
        data-onboarding="sidebar"
        className={cn(
          'w-64 border-r border-border/50 bg-muted/30 flex flex-col transition-all duration-300',
          !sidebarOpen && 'w-0 overflow-hidden'
        )}
      >
        {/* Brand Header - Centered with Logo */}
        <div className="h-16 px-5 flex items-center justify-center border-b border-border/50 relative">
          <div className="flex items-center gap-1">
            <EaseMailLogo className="h-9 w-9" />
            <span className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              EaseMail
            </span>
          </div>
          {/* âœ… PHASE 2: Show keyboard hint when waiting for second key */}
          {waitingForSecondKey && (
            <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-md text-xs font-medium animate-in fade-in">
              Waiting for key...
            </div>
          )}
          {/* âœ… PHASE 4: Offline indicator */}
          {!isOnline && (
            <div className="absolute top-4 left-4 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
              Offline
            </div>
          )}
        </div>

        {/* Folders - Scrollable area */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* Compose Button - Make it stand out */}
          <div className="px-4 pb-4">
            <Button 
              className="w-full h-11 text-base font-medium shadow-sm" 
              onClick={() => setIsComposeOpen(true)}
              data-onboarding="compose-button"
            >
              <Plus className="h-5 w-5 mr-2" />
              Compose
            </Button>
          </div>

          {/* âœ… PHASE 3: Recently Used Folders */}
          {recentFolders.length > 0 && (
            <div className="px-2 mb-2">
              <h3 className="px-3 text-xs font-semibold text-muted-foreground mb-2">RECENT</h3>
              <div className="space-y-0.5">
                {recentFolders.map(folderName => {
                  const folder = folders.find(f => 
                    (f.name || f.folderType?.toLowerCase()) === folderName
                  );
                  if (!folder) return null;
                  
                  const Icon = getFolderIcon(folder.folderType);
                  const realTimeCount = folderCounts[folderName.toLowerCase()];
                  const count = realTimeCount?.unreadCount || folder.unreadCount || 0;
                  const isActive = activeFolder === folderName;

                  return (
                    <button
                      key={folderName}
                      onClick={() => handleFolderSelect(folderName)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all',
                        isActive
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'hover:bg-accent text-muted-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate text-xs">{folder.displayName}</span>
                      </div>
                      {count > 0 && (
                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="space-y-0.5 px-2">
            {/* âœ… PHASE 2: Show skeleton while loading */}
            {foldersLoading ? (
              <FolderSkeleton />
            ) : (
              foldersToDisplay.map((folder: any) => {
              const Icon = folder.icon || getFolderIcon(folder.folderType);
              // âœ… FIX #2: Use displayName for UI, but internal name for queries
              const displayName = folder.displayName || folder.name;
              const folderName = folder.name || folder.folderType?.toLowerCase() || 'inbox';
              
              // âœ… PHASE 2: Use real-time counts from local database
              const realTimeCount = folderCounts[folderName.toLowerCase()];
              const count = realTimeCount?.unreadCount || folder.unreadCount || folder.count || 0;
              
              // âœ… FIX #6: Check against activeFolder state
              const isActive = activeFolder === folderName;
              // âœ… PHASE 3: Check if this is the drop target
              const isDropTarget = dropTarget === folder.id;
              
              return (
                <button
                  key={folder.id || folder.name}
                  onClick={() => {
                    // âœ… PHASE 3: Use handleFolderSelect for tracking
                    handleFolderSelect(folderName);
                  }}
                  onMouseEnter={() => {
                    // âœ… PHASE 4: Prefetch emails on hover for instant navigation
                    // âœ… FIX: Check accountId exists before prefetching
                    if (selectedAccountId && folderName) {
                      prefetchEmails(selectedAccountId, folderName);
                    }
                  }}
                  onMouseLeave={cancelPrefetch}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folderName, () => {
                    // Refresh emails after move
                    window.dispatchEvent(new Event('refreshEmails'));
                  })}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                      : isDropTarget
                      ? 'bg-accent border-2 border-primary'
                      : 'hover:bg-accent hover:shadow-sm text-muted-foreground'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
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
            }))}

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
                  onClick={() => {
                    // âœ… PHASE 3: Use handleFolderSelect for tracking
                    const folderName = folder.displayName;
                    handleFolderSelect(folderName);
                  }}
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
        </div>

        {/* Quick Access - Sticky at bottom */}
        <div className="border-t border-border/50 bg-card">
          <div className="px-2 py-3 space-y-0.5">
            <button
              onClick={() => router.push('/calendar')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                pathname === '/calendar' 
                  ? "bg-primary text-primary-foreground font-medium shadow-sm"
                  : "hover:bg-accent hover:shadow-sm text-muted-foreground"
              )}
            >
              <Calendar className="h-4 w-4" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => router.push('/contacts')}
              data-onboarding="contacts-button"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                pathname === '/contacts'
                  ? "bg-primary text-primary-foreground font-medium shadow-sm"
                  : "hover:bg-accent hover:shadow-sm text-muted-foreground"
              )}
            >
              <User className="h-4 w-4" />
              <span>Contacts</span>
            </button>
            <button
              onClick={() => router.push('/attachments')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-accent hover:shadow-sm text-muted-foreground transition-all"
            >
              <Paperclip className="h-4 w-4" />
              <span>Attachments</span>
            </button>
          </div>
        </div>

        {/* User Menu */}
        <div className="p-2.5 border-t border-border space-y-1">
          <SettingsMenu 
            onLogout={handleLogout}
            onNavigate={(path) => router.push(path)}
            userRole={userRole}
            hasOrganization={hasOrganization}
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
            data-add-account="true"
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Account</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
            {/* ✅ FIX #1: Pass selectedAccountId to children */}
            {React.Children.map(children, child => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child as any, { 
                  accountId: selectedAccountId,
                  activeFolder: activeFolder 
                });
              }
              return child;
            })}
          </div>
        </main>
      </div>
      
      {/* Email Compose Window */}
      <EmailCompose 
        isOpen={isComposeOpen} 
        onClose={() => {
          setIsComposeOpen(false);
          setComposeData(null);
        }}
        type={composeData?.type || 'compose'}
        accountId={selectedAccountId || undefined}
        replyTo={composeData ? (composeData.type && composeData.email?.fromEmail ? {
          to: composeData.type === 'replyAll' 
            ? [
                composeData.email.fromEmail,
                ...(composeData.email.toEmails?.map((t: any) => t.email) || []),
                ...(composeData.email.ccEmails?.map((c: any) => c.email) || [])
              ].filter(Boolean).join(', ')
            : composeData.email.fromEmail,
          subject: composeData.type === 'forward' 
            ? `Fwd: ${composeData.email.subject}` 
            : `Re: ${composeData.email.subject}`,
          messageId: composeData.email.id || '',
          body: composeData.email.bodyText || composeData.email.bodyHtml || composeData.email.snippet || ''
        } : {
          // New compose with pre-filled "to" (from contacts)
          to: composeData.email?.to || '',
          subject: composeData.email?.subject || '',
          messageId: '',
        }) : undefined}
      />
      
      {/* Provider Selector Dialog */}
      <ProviderSelector isOpen={isProviderSelectorOpen} onClose={() => setIsProviderSelectorOpen(false)} />
      
      {/* ✅ PHASE 3: Folder Search Command Menu */}
      <FolderSearch
        isOpen={isFolderSearchOpen}
        onClose={() => setIsFolderSearchOpen(false)}
        folders={folders}
        onSelectFolder={handleFolderSelect}
        getFolderIcon={getFolderIcon}
      />
    </div>
  );
}

