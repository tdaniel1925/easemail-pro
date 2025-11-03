'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import InboxLayout from '@/components/layout/InboxLayout';
import EmailClient from '@/components/email/EmailClient';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import OnboardingOverlay from '@/components/onboarding/OnboardingOverlay';

function InboxContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const searchParams = useSearchParams();
  const folder = searchParams.get('folder') || null;
  const onboardingParam = searchParams.get('onboarding');
  
  // Check if onboarding should start
  const startFromBeginning = onboardingParam === 'restart';

  return (
    <OnboardingProvider startFromBeginning={startFromBeginning}>
      <InboxLayout>
        <EmailClient 
          searchQuery={searchQuery} 
          onSearchChange={setSearchQuery}
          folder={folder}
        />
        <OnboardingOverlay />
      </InboxLayout>
    </OnboardingProvider>
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

