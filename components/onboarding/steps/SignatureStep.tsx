'use client';

import { useEffect } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { OnboardingTooltip } from '../OnboardingTooltip';

export default function SignatureStep() {
  const { setHighlightedElement } = useOnboarding();

  useEffect() => {
    // Highlight the Settings button (gear icon in sidebar)
    setHighlightedElement('[data-onboarding="settings-button"]');
    return () => setHighlightedElement(null);
  }, [setHighlightedElement]);

  // Position near Settings button (bottom of sidebar)
  return (
    <div className="fixed z-[60] left-[280px] bottom-[120px] max-w-[420px]">
      <OnboardingTooltip
        title="Add Email Signature"
        description="Click the Settings icon (⚙️ gear) at the bottom of the left sidebar, then go to Signatures to create a professional email signature with your name, title, and contact info."
        nextLabel="Next: AI Features"
        showBack={true}
      />
    </div>
  );
}
