'use client';

import { useEffect } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { OnboardingTooltip } from '../OnboardingTooltip';

export default function ConnectAccountStep() {
  const { setHighlightedElement } = useOnboarding();

  useEffect(() => {
    // Highlight the "Connect Account" button
    setHighlightedElement('[data-onboarding="connect-account-button"]');
    return () => setHighlightedElement(null);
  }, [setHighlightedElement]);

  return (
    <div
      className="fixed z-[60] top-24 left-1/2 -translate-x-1/2"
      style={{ maxWidth: '400px' }}
    >
      <OnboardingTooltip
        title="Connect Your Email Account"
        description="Click the '+ Connect Account' button to link your Gmail, Outlook, or IMAP email. This lets EaseMail manage your emails with AI-powered features."
        nextLabel="Next: Signatures"
        showBack={false}
      />
    </div>
  );
}

