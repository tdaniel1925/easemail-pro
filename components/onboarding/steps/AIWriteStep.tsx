'use client';

import { useEffect } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { OnboardingTooltip } from '../OnboardingTooltip';

export default function AIWriteStep() {
  const { setHighlightedElement } = useOnboarding();

  useEffect(() => {
    setHighlightedElement('[data-onboarding="compose-button"]');
    return () => setHighlightedElement(null);
  }, [setHighlightedElement]);

  return (
    <div
      className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ maxWidth: '400px' }}
    >
      <OnboardingTooltip
        title="AI-Powered Email Writing"
        description="Write emails 10x faster! Click 'Compose', then use the AI Write button to generate professional emails from just a few words. Try it: 'follow up meeting request'"
        nextLabel="Next: Voice Messages"
      />
    </div>
  );
}

