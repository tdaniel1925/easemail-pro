'use client';

import { useEffect } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { OnboardingTooltip } from '../OnboardingTooltip';

export default function VoiceMessageStep() {
  const { setHighlightedElement } = useOnboarding();

  useEffect(() => {
    setHighlightedElement('[data-onboarding="compose-button"]');
    return () => setHighlightedElement(null);
  }, [setHighlightedElement]);

  // Center of screen for better visibility
  return (
    <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[420px]">
      <OnboardingTooltip
        title="Voice Messages & Dictation"
        description="In the compose window, click the microphone icon (🎤) to either dictate text in real-time OR record an audio message that gets attached as an MP3 file. Perfect for adding a personal touch!"
        nextLabel="Next: SMS"
        showBack={true}
      />
    </div>
  );
}
