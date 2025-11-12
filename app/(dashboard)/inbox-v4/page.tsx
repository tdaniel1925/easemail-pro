'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import InboxLayout from '@/components/layout/InboxLayout';
import { EmailList } from '@/components/email/EmailList';
import { ContactPanel } from '@/components/email/ContactPanel';

function InboxV4Content() {
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [rightSidebarTab, setRightSidebarTab] = useState<'contact' | 'calendar' | 'ai' | 'sms'>('calendar');

  const searchParams = useSearchParams();
  const folder = searchParams.get('folder') || null;

  const selectedEmail = emails.find(email => email.id === selectedEmailId);

  const handleEmailClick = (emailId: string) => {
    // Toggle expansion
    setExpandedEmailId(expandedEmailId === emailId ? null : emailId);
    // Set as selected for contact panel
    setSelectedEmailId(emailId);
  };

  const refreshEmails = () => {
    // Trigger refresh
    window.dispatchEvent(new CustomEvent('refreshEmails'));
  };

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
          onSearchChange={setSearchQuery}
          onRefresh={refreshEmails}
          currentFolder={folder || 'inbox'}
        />
      </div>

      {/* Right Sidebar (25%) - Contact Panel */}
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

export default function InboxV4Page() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <InboxLayout>
        <InboxV4Content />
      </InboxLayout>
    </Suspense>
  );
}
