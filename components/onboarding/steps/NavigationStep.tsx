'use client';

import { useEffect } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { OnboardingTooltip } from '../OnboardingTooltip';

export default function NavigationStep() {
  const { setHighlightedElement } = useOnboarding();

  useEffect(() => {
    // Highlight the entire sidebar
    setHighlightedElement('[data-onboarding="sidebar"]');
    return () => setHighlightedElement(null);
  }, [setHighlightedElement]);

  // Center of screen for final tip
  return (
    <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[480px]">
      <OnboardingTooltip
        title="Master the Sidebar Navigation"
        description="Use the left sidebar to navigate: Compose new emails, view Inbox/Sent/Drafts, access Calendar, Contacts, Rules, Attachments, and Settings. Quick keyboard shortcut: Press 'C' to compose anytime!"
        nextLabel="Finish Tour"
        showBack={true}
      />
    </div>
  );
}
