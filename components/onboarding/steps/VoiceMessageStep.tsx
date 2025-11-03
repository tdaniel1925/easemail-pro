'use client';

import { useEffect } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { OnboardingTooltip } from '../OnboardingTooltip';

export default function VoiceMessageStep() {
  const { setHighlightedElement } = useOnboarding();

  useEffect(() => {
    setHighlightedElement('[data-onboarding="voice-message-button"]');
    return () => setHighlightedElement(null);
  }, [setHighlightedElement]);

  return (
    <div
      className="fixed z-[60] top-1/2 right-8"
      style={{ maxWidth: '400px' }}
    >
      <OnboardingTooltip
        title="Voice Messages"
        description="Add a personal touch! Record voice messages and attach them to emails. Great for quick updates or when typing isn't convenient."
        nextLabel="Next: SMS"
      />
    </div>
  );
}

