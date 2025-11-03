'use client';

import { useEffect } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { OnboardingTooltip } from '../OnboardingTooltip';

export default function NavigationStep() {
  const { setHighlightedElement } = useOnboarding();

  useEffect(() => {
    setHighlightedElement('[data-onboarding="sidebar"]');
    return () => setHighlightedElement(null);
  }, [setHighlightedElement]);

  return (
    <div
      className="fixed z-[60] top-1/3 left-1/2 -translate-x-1/2"
      style={{ maxWidth: '400px' }}
    >
      <OnboardingTooltip
        title="Master Navigation"
        description="Use the sidebar to switch between Inbox, Contacts, Calendar, Attachments, and Settings. Press '?' anytime to see keyboard shortcuts!"
        nextLabel="Complete Tour"
      />
    </div>
  );
}

