'use client';

import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import OnboardingOverlay from '@/components/onboarding/OnboardingOverlay';
import { ReactNode } from 'react';

export function DashboardProviders({ 
  children, 
  userId 
}: { 
  children: ReactNode; 
  userId: string;
}) {
  return (
    <OnboardingProvider userId={userId}>
      {children}
      <OnboardingOverlay />
    </OnboardingProvider>
  );
}

