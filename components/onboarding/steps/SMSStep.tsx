'use client';

import { useEffect } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { OnboardingTooltip } from '../OnboardingTooltip';

export default function SMSStep() {
  const { setHighlightedElement } = useOnboarding();

  useEffect(() => {
    // Highlight the Contacts button in sidebar
    setHighlightedElement('[data-onboarding="contacts-button"]');
    return () => setHighlightedElement(null);
  }, [setHighlightedElement]);

  // Position near Contacts button in sidebar
  return (
    <div className="fixed z-[60] left-[280px] top-[280px] max-w-[420px]">
      <OnboardingTooltip
        title="Send SMS from Contacts"
        description="Click 'Contacts' in the left sidebar, select a contact with a phone number, and click the SMS button (💬 icon) to send text messages directly from EaseMail."
        nextLabel="Next: Navigation"
        showBack={true}
      />
    </div>
  );
}
