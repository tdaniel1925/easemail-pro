'use client';

import { useEffect } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { OnboardingTooltip } from '../OnboardingTooltip';

export default function SMSStep() {
  const { setHighlightedElement } = useOnboarding();

  useEffect(() => {
    setHighlightedElement('[data-onboarding="contacts-link"]');
    return () => setHighlightedElement(null);
  }, [setHighlightedElement]);

  return (
    <div
      className="fixed z-[60] bottom-1/4 left-8"
      style={{ maxWidth: '400px' }}
    >
      <OnboardingTooltip
        title="Send SMS from Contacts"
        description="Go to Contacts, find any contact with a phone number, and send them an SMS directly from EaseMail. No need to switch apps!"
        nextLabel="Next: Navigation"
      />
    </div>
  );
}

