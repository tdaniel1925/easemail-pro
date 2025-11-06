'use client';

import { useState, useEffect } from 'react';
import { EmailList } from './EmailList';
import { ContactPanel } from './ContactPanel';
import SyncingIndicator from './SyncingIndicator';
import WelcomeScreen from './WelcomeScreen';

interface EmailClientProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  folder?: string | null;
  accountId?: string | null; // ✅ FIX #1: Accept accountId as prop
  activeFolder?: string; // ✅ FIX #6: Accept activeFolder from parent
}

export default function EmailClient({ 
  searchQuery = '', 
  onSearchChange, 
  folder = null,
  accountId: propAccountId = null, // ✅ FIX #4: Use accountId from props
  activeFolder = 'inbox'
}: EmailClientProps) {
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountCheckComplete, setAccountCheckComplete] = useState(false); // Track if we've checked for accounts
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh trigger
  const [rightSidebarTab, setRightSidebarTab] = useState<'contact' | 'calendar' | 'ai' | 'sms'>('calendar'); // SMS tab control

  // Function to refresh email list
  const refreshEmails = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Listen for refresh events from individual email actions
  useEffect(() => {
    const handleRefreshEvent = () => {
      refreshEmails();
    };

    window.addEventListener('refreshEmails' as any, handleRefreshEvent);
    return () => window.removeEventListener('refreshEmails' as any, handleRefreshEvent);
  }, []);

  // Track when account check is complete (either we have an account or confirmed there are none)
  useEffect(() => {
    // ✅ FIX: Only mark complete when we have definitive account state
    // If propAccountId changes from null to a value, we have an account
    // If it stays null after initial load, parent has confirmed no accounts exist
    if (propAccountId !== null && propAccountId !== undefined) {
      // We have an account - mark complete immediately
      setAccountCheckComplete(true);
    } else {
      // No account yet - wait briefly to let parent finish loading
      const timer = setTimeout(() => {
        setAccountCheckComplete(true);
      }, 200); // Reduced from 500ms to 200ms for faster response
      return () => clearTimeout(timer);
    }
  }, [propAccountId]);

  // Fetch emails when search query, folder, or accountId changes (with debouncing)
  useEffect(() => {
    // ✅ FIX #4: Don't fetch if we don't have an accountId yet
    if (!propAccountId) {
      console.log('[Email] No accountId provided yet, waiting...');
      setEmails([]);
      setLoading(false);
      return;
    }

    // Debounce search query changes
    const timeoutId = setTimeout(() => {
      const fetchEmails = async () => {
        setLoading(true);
        try {
          await fetchEmailsForAccount(propAccountId, searchQuery, activeFolder);
        } catch (error) {
          console.error('Failed to fetch emails:', error);
        } finally {
          setLoading(false);
        }
      };

      const fetchEmailsForAccount = async (accId: string, query: string, folderName: string) => {
        console.log('[Email] Fetching emails for account:', accId, 'Query:', query, 'Folder:', folderName);
        
        // Build URL with folder parameter if provided
        let url = '';
        if (query.trim()) {
          // Search query takes precedence
          url = `/api/nylas/messages/search?accountId=${accId}&query=${encodeURIComponent(query)}&limit=100`;
        } else if (folderName && folderName !== 'inbox') {
          // Filter by specific folder (inbox is default, so no need to pass it)
          url = `/api/nylas/messages?accountId=${accId}&folder=${encodeURIComponent(folderName)}&limit=100`;
        } else {
          // Default inbox view
          url = `/api/nylas/messages?accountId=${accId}&limit=100`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
          console.log('[Email] Fetched emails:', data.messages?.length || 0, 'for folder:', folderName);
          setEmails(data.messages || []);
        } else {
          console.error('❌ Failed to fetch emails:', data.error);
          setEmails([]);
        }
      };

      fetchEmails();
    }, 300); // 300ms debounce

    // Cleanup timeout on unmount or when dependencies change
    return () => clearTimeout(timeoutId);
  }, [searchQuery, refreshKey, activeFolder, propAccountId]); // ✅ FIX #4: Re-fetch when accountId changes

  const selectedEmail = emails.find(email => email.id === selectedEmailId);

  const handleEmailClick = (emailId: string) => {
    // Toggle expansion
    setExpandedEmailId(expandedEmailId === emailId ? null : emailId);
    // Set as selected for contact panel
    setSelectedEmailId(emailId);
  };

  // Show welcome screen ONLY if account check is complete AND no account exists
  if (accountCheckComplete && !propAccountId) {
    return <WelcomeScreen />;
  }

  // Show loading while checking for accounts
  if (!accountCheckComplete) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Show syncing indicator if we have an account but NO emails (or still loading)
  if (propAccountId && emails.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <SyncingIndicator accountId={propAccountId || undefined} emailCount={emails.length} />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Email List Column (75%) */}
      <div className="w-3/4 border-r border-border">
        <EmailList
          emails={emails}
          expandedEmailId={expandedEmailId}
          selectedEmailId={selectedEmailId}
          onEmailClick={handleEmailClick}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onRefresh={refreshEmails}
          currentFolder={activeFolder}
          onSMSBellClick={() => setRightSidebarTab('sms')}
        />
      </div>

      {/* Mini Calendar Sidebar (25%) */}
      <div className="w-1/4 border-l border-border">
        <ContactPanel 
          email={selectedEmail} 
          activeTab={rightSidebarTab}
          onTabChange={setRightSidebarTab}
        />
      </div>
    </div>
  );
}

