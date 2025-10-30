'use client';

import { useState } from 'react';
import InboxLayout from '@/components/layout/InboxLayout';
import EmailClient from '@/components/email/EmailClient';

export default function InboxPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <InboxLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <EmailClient searchQuery={searchQuery} />
    </InboxLayout>
  );
}


