'use client';

import { useState, useEffect } from 'react';
import { User, MessageCircle } from 'lucide-react';
import { EmailList } from './EmailList';
import { ContactPanel } from './ContactPanel';
import { cn } from '@/lib/utils';

export default function EmailClient() {
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contact' | 'ai'>('contact');

  // Fetch real emails from database
  useEffect(() => {
    const fetchEmails = async () => {
      try {
        // First get the first available account
        const accountsResponse = await fetch('/api/nylas/accounts');
        const accountsData = await accountsResponse.json();
        
        if (!accountsData.success || !accountsData.accounts || accountsData.accounts.length === 0) {
          console.log('⚠️ No accounts found');
          setLoading(false);
          return;
        }

        const accountId = accountsData.accounts[0].id;
        console.log('📬 Fetching emails for account:', accountId);
        
        const response = await fetch(`/api/nylas/messages?accountId=${accountId}&limit=1000`);
        const data = await response.json();
        
        if (data.success) {
          console.log('📧 Fetched emails:', data.messages?.length || 0);
          setEmails(data.messages || []);
        }
      } catch (error) {
        console.error('Failed to fetch emails:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, []);

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
        <p className="text-muted-foreground">No emails found. Sync your account to see emails.</p>
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

