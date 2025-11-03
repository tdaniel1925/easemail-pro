'use client';

import { useEffect } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { OnboardingTooltip } from '../OnboardingTooltip';

export default function SignatureStep() {
  const { setHighlightedElement } = useOnboarding();

  useEffect(() => {
    setHighlightedElement('[data-onboarding="settings-button"]');
    return () => setHighlightedElement(null);
  }, [setHighlightedElement]);

  return (
    <div
      className="fixed z-[60] bottom-24 left-8"
      style={{ maxWidth: '400px' }}
    >
      <OnboardingTooltip
        title="Create Your Email Signature"
        description="Professional email signatures make your emails look polished. Go to Settings → Signatures to create one with your name, title, and contact info."
        nextLabel="Next: AI Writing"
      />
    </div>
  );
}

