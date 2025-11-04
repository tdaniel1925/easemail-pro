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

  return (
    <OnboardingTooltip
      title="Voice Messages & Dictation"
      description="In the compose window, click the microphone icon (🎤) to either dictate text in real-time OR record an audio message that gets attached as an MP3 file. Perfect for adding a personal touch!"
      nextLabel="Next: SMS"
      showBack={true}
      position="center"
    />
  );
}
