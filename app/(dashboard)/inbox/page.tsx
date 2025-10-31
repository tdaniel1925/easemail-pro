'use client';

import { useState, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import InboxLayout from '@/components/layout/InboxLayout';
import EmailClient from '@/components/email/EmailClient';

function InboxContent() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <InboxLayout>
      <EmailClient searchQuery={searchQuery} onSearchChange={setSearchQuery} />
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

