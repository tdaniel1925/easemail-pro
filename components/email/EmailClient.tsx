'use client';

import { useState, useEffect } from 'react';
import { EmailList } from './EmailList';
import { ContactPanel } from './ContactPanel';
import SyncingIndicator from './SyncingIndicator';

interface EmailClientProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  folder?: string | null;
}

export default function EmailClient({ searchQuery = '', onSearchChange, folder = null }: EmailClientProps) {
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh trigger

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

  // Fetch emails when search query changes (with debouncing)
  useEffect(() => {
    // Debounce search query changes
    const timeoutId = setTimeout(() => {
      const fetchEmails = async () => {
        setLoading(true);
        try {
          // First get the first available account if we don't have one
          if (!accountId) {
            const accountsResponse = await fetch('/api/nylas/accounts');
            const accountsData = await accountsResponse.json();
            
            if (!accountsData.success || !accountsData.accounts || accountsData.accounts.length === 0) {
              console.log('⚠️ No accounts found');
              setLoading(false);
              return;
            }

            const firstAccountId = accountsData.accounts[0].id;
            setAccountId(firstAccountId);
            
            // Fetch emails for this account
            await fetchEmailsForAccount(firstAccountId, searchQuery, folder);
          } else {
            // We already have an account, just fetch
            await fetchEmailsForAccount(accountId, searchQuery, folder);
          }
        } catch (error) {
          console.error('Failed to fetch emails:', error);
        } finally {
          setLoading(false);
        }
      };

      const fetchEmailsForAccount = async (accId: string, query: string, folderName: string | null) => {
        console.log('📬 Fetching emails for account:', accId, 'Query:', query, 'Folder:', folderName);
        
        // Build URL with folder parameter if provided
        let url = '';
        if (query.trim()) {
          // Search query takes precedence
          url = `/api/nylas/messages/search?accountId=${accId}&query=${encodeURIComponent(query)}&limit=100`;
        } else if (folderName) {
          // Filter by folder
          url = `/api/nylas/messages?accountId=${accId}&folder=${encodeURIComponent(folderName)}&limit=100`;
        } else {
          // Default inbox view
          url = `/api/nylas/messages?accountId=${accId}&limit=100`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
          console.log('📧 Fetched emails:', data.messages?.length || 0);
          setEmails(data.messages || []);
        }
      };

      fetchEmails();
    }, 300); // 300ms debounce

    // Cleanup timeout on unmount or when searchQuery changes
    return () => clearTimeout(timeoutId);
  }, [searchQuery, refreshKey, folder]); // Re-fetch when search query, refreshKey, OR folder changes

  const selectedEmail = emails.find(email => email.id === selectedEmailId);

  const handleEmailClick = (emailId: string) => {
    // Toggle expansion
    setExpandedEmailId(expandedEmailId === emailId ? null : emailId);
    // Set as selected for contact panel
    setSelectedEmailId(emailId);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading emails...</p>
      </div>
    );
  }

  // Show syncing indicator only if NO emails at all
  if (emails.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <SyncingIndicator accountId={accountId || undefined} emailCount={emails.length} />
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
          currentFolder={folder}
        />
      </div>

      {/* Mini Calendar Sidebar (25%) */}
      <div className="w-1/4 border-l border-border">
        <ContactPanel email={selectedEmail} />
      </div>
    </div>
  );
}

