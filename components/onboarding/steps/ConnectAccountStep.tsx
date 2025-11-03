'use client';

import { useEffect } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { OnboardingTooltip } from '../OnboardingTooltip';

export default function ConnectAccountStep() {
  const { setHighlightedElement } = useOnboarding();

  useEffect(() => {
    // Highlight the "Add Account" button (blue button at bottom of sidebar)
    setHighlightedElement('[data-onboarding="add-account-button"]');
    return () => setHighlightedElement(null);
  }, [setHighlightedElement]);

  // Position next to the Add Account button (bottom left of sidebar)
  return (
    <div className="fixed z-[60] left-[280px] bottom-[80px] max-w-[420px]">
      <OnboardingTooltip
        title="Connect Your Email Account"
        description="Click the blue 'Add Account' button at the bottom of the left sidebar to link your Gmail, Outlook, or IMAP email. This lets EaseMail manage your emails with AI-powered features."
        nextLabel="Next: Signatures"
        showBack={false}
      />
    </div>
  );
}
