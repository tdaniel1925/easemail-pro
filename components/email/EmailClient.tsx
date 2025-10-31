'use client';

import { useState, useEffect } from 'react';
import { User, MessageCircle } from 'lucide-react';
import { EmailList } from './EmailList';
import { ContactPanel } from './ContactPanel';
import { cn } from '@/lib/utils';
import SyncingIndicator from './SyncingIndicator';

interface EmailClientProps {
  searchQuery?: string;
}

export default function EmailClient({ searchQuery = '' }: EmailClientProps) {
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contact' | 'ai'>('contact');
  const [accountId, setAccountId] = useState<string | null>(null);

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
            await fetchEmailsForAccount(firstAccountId, searchQuery);
          } else {
            // We already have an account, just fetch
            await fetchEmailsForAccount(accountId, searchQuery);
          }
        } catch (error) {
          console.error('Failed to fetch emails:', error);
        } finally {
          setLoading(false);
        }
      };

      const fetchEmailsForAccount = async (accId: string, query: string) => {
        console.log('📬 Fetching emails for account:', accId, 'Query:', query);
        
        // If there's a search query, use search endpoint, otherwise use regular endpoint
        const url = query.trim()
          ? `/api/nylas/messages/search?accountId=${accId}&query=${encodeURIComponent(query)}&limit=1000`
          : `/api/nylas/messages?accountId=${accId}&limit=1000`;
        
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
  }, [searchQuery]); // Re-fetch when search query changes

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

  if (emails.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <SyncingIndicator accountId={accountId || undefined} />
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
        />
      </div>

      {/* Contact Panel (25%) */}
      <div className="w-1/4 border-l border-border flex flex-col">
        {/* Tabs Header */}
        <div className="h-14 border-b border-border flex items-center px-4">
          <div className="flex gap-2">
            <button
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-sm transition-colors',
                activeTab === 'contact'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              onClick={() => setActiveTab('contact')}
            >
              <User className="h-4 w-4 inline mr-2" />
              Contact
            </button>
            <button
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-sm transition-colors',
                activeTab === 'ai'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              onClick={() => setActiveTab('ai')}
            >
              <MessageCircle className="h-4 w-4 inline mr-2" />
              AI Chat
            </button>
          </div>
        </div>

        {/* Contact Panel Content */}
        <div className="flex-1 overflow-hidden">
          <ContactPanel
            email={selectedEmail}
            onClose={() => setSelectedEmailId(null)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </div>
    </div>
  );
}

