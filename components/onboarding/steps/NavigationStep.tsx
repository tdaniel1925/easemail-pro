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

  return (
    <OnboardingTooltip
      title="Master the Sidebar Navigation"
      description="Use the left sidebar to navigate: Compose new emails, view Inbox/Sent/Drafts, access Calendar, Contacts, Rules, Attachments, and Settings. Quick keyboard shortcut: Press 'C' to compose anytime!"
      nextLabel="Finish Tour"
      showBack={true}
      position="center"
    />
  );
}
