'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import InboxLayout from '@/components/layout/InboxLayout';
import EmailClient from '@/components/email/EmailClient';
import { SMSInbox } from '@/components/sms/SMSInbox';

function InboxContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const searchParams = useSearchParams();
  const folder = searchParams.get('folder') || null;

  // Show SMS inbox if folder is 'sms'
  if (folder === 'sms') {
    return (
      <InboxLayout>
        <SMSInbox />
      </InboxLayout>
    );
  }

  return (
    <InboxLayout>
      <EmailClient 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery}
        folder={folder}
      />
    </InboxLayout>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <InboxContent />
    </Suspense>
  );
}

